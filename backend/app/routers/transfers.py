from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.dependencies import get_current_user

# Models
from app.models.transfer_model import Transfer, TransferDetail
from app.models.product_model import Product, ProductSeries, Inventory
from app.models.user_model import User
from app.models.store_model import Store
from app.models.inventory_movement_model import InventoryMovement

# Schemas
from app.schemas.transfer_schema import TransferCreate, TransferResponse, TransferItemResponse

router = APIRouter()

# 1. SOLICITAR TRANSFERENCIA (Crear)
@router.post("/", response_model=TransferResponse)
def create_transfer_request(
    transfer_data: TransferCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if transfer_data.source_store_id == transfer_data.target_store_id:
        raise HTTPException(status_code=400, detail="La tienda origen y destino no pueden ser la misma.")

    # Crear Cabecera
    new_transfer = Transfer(
        source_store_id=transfer_data.source_store_id,
        target_store_id=transfer_data.target_store_id,
        user_request_id=current_user.user_id,
        notes=transfer_data.notes,
        status="PENDIENTE"
    )
    # Validar duplicados en la solicitud
    seen_serials = set()
    for item in transfer_data.items:
        if item.serial_number:
            if item.serial_number in seen_serials:
                raise HTTPException(status_code=400, detail=f"El IMEI {item.serial_number} está duplicado en la solicitud.")
            seen_serials.add(item.serial_number)

    db.add(new_transfer)
    db.flush()

    for item in transfer_data.items:

        
        # Validar producto
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")

        # Determinar series_id
        series_id_to_save = item.series_id  # Usar si viene directamente
        
        # Si no viene series_id pero sí serial_number, buscar el series_id
        if not series_id_to_save and item.serial_number:
            series = db.query(ProductSeries).filter(
                ProductSeries.serial_number == item.serial_number,
                ProductSeries.product_id == item.product_id
            ).first()
            if series:
                series_id_to_save = series.series_id

            else:

                raise HTTPException(
                    status_code=404, 
                    detail=f"IMEI {item.serial_number} no encontrado para producto {item.product_id}"
                )


        
        # Guardar detalle
        det = TransferDetail(
            transfer_id=new_transfer.transfer_id,
            product_id=item.product_id,
            series_id=series_id_to_save,
            quantity=item.quantity
        )
        db.add(det)

    db.commit()
    return _format_transfer_response(new_transfer, db)

# 2. LISTAR TRANSFERENCIAS
@router.get("/", response_model=List[TransferResponse])
def list_transfers(
    role: str = None, # 'origin' | 'destination' | 'all'
    store_id: int = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transfer)
    
    if store_id:
        if role == 'origin':
            query = query.filter(Transfer.source_store_id == store_id)
        elif role == 'destination':
            query = query.filter(Transfer.target_store_id == store_id)
        else:
            # Todas las implicadas
            query = query.filter((Transfer.source_store_id == store_id) | (Transfer.target_store_id == store_id))
            
    transfers = query.order_by(Transfer.date_requested.desc()).all()
    
    return [_format_transfer_response(t, db) for t in transfers]


# 3. DESPACHAR (Enviar mercadería) - RESTA STOCK
@router.put("/{transfer_id}/dispatch", response_model=TransferResponse)
def dispatch_transfer(
    transfer_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    transfer = db.query(Transfer).filter(Transfer.transfer_id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada")
        
    if transfer.status != "PENDIENTE":
        raise HTTPException(status_code=400, detail="Solo se pueden despachar transferencias PENDIENTES")
        
    # Verificar que soy usuario de la tienda ORIGEN o SuperAdmin (role_id == 1)
    if current_user.store_id != transfer.source_store_id and current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="No tienes permiso para despachar desde esta tienda.")
    
    # PROCESAR CADA ITEM
    for detail in transfer.details:
        product = db.query(Product).filter(Product.product_id == detail.product_id).first()
        
        # A. PRODUCTO SERIALIZADO (IMEI)
        if product.is_serializable:
            if not detail.series_id:
                raise HTTPException(status_code=400, detail=f"Item de {product.name} requiere Series ID")
                
            serie = db.query(ProductSeries).filter(ProductSeries.series_id == detail.series_id).first()
            if not serie:
                raise HTTPException(status_code=404, detail=f"Serie no encontrada")
                
            if serie.store_id != transfer.source_store_id:
                raise HTTPException(status_code=400, detail=f"Serie {serie.serial_number} no está en la tienda de origen")
                
            if serie.status != "disponible":
                 raise HTTPException(status_code=400, detail=f"Serie {serie.serial_number} no está disponible")
            
            # CAMBIAR ESTADO
            serie.status = "en_transito"
        
        # B. PRODUCTO SIMPLE (CANTIDAD)
        else:
            inventory = db.query(Inventory).filter(
                Inventory.product_id == detail.product_id,
                Inventory.store_id == transfer.source_store_id
            ).first()
            
            if not inventory or inventory.quantity < detail.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente de {product.name} en origen")
            
            inventory.quantity -= detail.quantity
            
        # REGISTRAR MOVIMIENTO (KARDEX - SALIDA POR TRANSFERENCIA)
        mov = InventoryMovement(
            product_id=product.product_id,
            user_id=current_user.user_id,
            type="SALIDA",
            reason=f"Transferencia Enviada #{transfer.transfer_id}",
            quantity=detail.quantity,
            unit_cost=product.average_cost
        )
        db.add(mov)

    # Actualizar Estado Transferencia
    transfer.status = "EN_TRANSITO"
    transfer.user_dispatch_id = current_user.user_id
    transfer.date_dispatched = datetime.now()
    
    db.commit()
    return _format_transfer_response(transfer, db)

# 4. RECIBIR (Ingresar mercadería) - SUMA STOCK
@router.put("/{transfer_id}/receive", response_model=TransferResponse)
def receive_transfer(
    transfer_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    transfer = db.query(Transfer).filter(Transfer.transfer_id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada")
        
    if transfer.status != "EN_TRANSITO":
        raise HTTPException(status_code=400, detail="Solo se pueden recibir transferencias EN TRÁNSITO")
    
    # Validar que soy destino
    if current_user.store_id != transfer.target_store_id and current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="No tienes permiso para recibir en esta tienda.")
        
    # PROCESAR CADA ITEM
    for detail in transfer.details:
        product = db.query(Product).filter(Product.product_id == detail.product_id).first()
        
        # A. PRODUCTO SERIALIZADO (IMEI)
        if product.is_serializable:
            serie = db.query(ProductSeries).filter(ProductSeries.series_id == detail.series_id).first()
            if not serie:
                 raise HTTPException(status_code=404, detail=f"Serie no encontrada") # Raro
            
            # CAMBIAR UBICACIÓN Y ESTADO
            serie.store_id = transfer.target_store_id
            serie.status = "disponible"
            
        # B. PRODUCTO SIMPLE (CANTIDAD)
        else:
            inventory = db.query(Inventory).filter(
                Inventory.product_id == detail.product_id,
                Inventory.store_id == transfer.target_store_id
            ).first()
            
            if inventory:
                inventory.quantity += detail.quantity
            else:
                new_inv = Inventory(
                    product_id=detail.product_id,
                    store_id=transfer.target_store_id,
                    quantity=detail.quantity
                )
                db.add(new_inv)
        
        # REGISTRAR MOVIMIENTO (KARDEX - ENTRADA POR TRANSFERENCIA)
        mov = InventoryMovement(
            product_id=product.product_id,
            user_id=current_user.user_id,
            type="ENTRADA",
            reason=f"Transferencia Recibida #{transfer.transfer_id}",
            quantity=detail.quantity,
            unit_cost=product.average_cost
        )
        db.add(mov)

    # Actualizar Estado Transferencia
    transfer.status = "RECIBIDO"
    transfer.user_receive_id = current_user.user_id
    transfer.date_received = datetime.now()
    
    db.commit()
    return _format_transfer_response(transfer, db)

# 5. RECHAZAR (Devolver mercadería) - RETORNA A ORIGEN
@router.put("/{transfer_id}/reject", response_model=TransferResponse)
def reject_transfer(
    transfer_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    transfer = db.query(Transfer).filter(Transfer.transfer_id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada")
        
    if transfer.status != "EN_TRANSITO":
        raise HTTPException(status_code=400, detail="Solo se pueden rechazar transferencias EN TRÁNSITO")
    
    # Validar que soy destino (quien rechaza es quien iba a recibir)
    if current_user.store_id != transfer.target_store_id and current_user.role_id != 1:
         raise HTTPException(status_code=403, detail="No tienes permiso para rechazar en esta tienda.")

    # PROCESAR CADA ITEM (DEVOLUCION)
    for detail in transfer.details:
        product = db.query(Product).filter(Product.product_id == detail.product_id).first()
        
        # A. SERIALIZADO
        if product.is_serializable:
            serie = db.query(ProductSeries).filter(ProductSeries.series_id == detail.series_id).first()
            if serie:
                # Regresa a ORIGEN y Disponible
                serie.store_id = transfer.source_store_id
                serie.status = "disponible"
        
        # B. SIMPLE
        else:
            # Sumar de vuelta al origen
            inventory = db.query(Inventory).filter(
                Inventory.product_id == detail.product_id,
                Inventory.store_id == transfer.source_store_id
            ).first()
            
            if inventory:
                inventory.quantity += detail.quantity
            else:
                # Caso raro, si borraron el inventario origen mientras viajaba
                new_inv = Inventory(product_id=detail.product_id, store_id=transfer.source_store_id, quantity=detail.quantity)
                db.add(new_inv)

        # REGISTRAR MOVIMIENTO (KARDEX - ENTRADA DEVOLUCION EN ORIGEN)
        # Nota: Usamos el ID del usuario actual (quien rechazó) para trazabilidad, 
        # aunque el stock se mueva en la otra tienda.
        mov = InventoryMovement(
            product_id=product.product_id,
            user_id=current_user.user_id,
            type="ENTRADA", # Reingreso
            reason=f"Rechazo Transferencia #{transfer.transfer_id}",
            quantity=detail.quantity,
            unit_cost=product.average_cost
        )
        db.add(mov)

    transfer.status = "RECHAZADO"
    transfer.user_receive_id = current_user.user_id # Quien rechazó
    transfer.date_received = datetime.now() # Fecha rechazo
    
    db.commit()
    return _format_transfer_response(transfer, db)


# Helper para formatear respuesta (porque Models no son Dicts)
def _format_transfer_response(transfer: Transfer, db: Session):
    # Cargar nombres de tiendas/usuarios si no vienen cargados
    s_store = db.query(Store).get(transfer.source_store_id)
    t_store = db.query(Store).get(transfer.target_store_id)
    u_req = db.query(User).get(transfer.user_request_id or 0)
    
    items_formatted = []
    for d in transfer.details:
        prod = db.query(Product).get(d.product_id)
        serial_str = None
        if d.series_id:
            s_obj = db.query(ProductSeries).get(d.series_id)
            if s_obj: serial_str = s_obj.serial_number
            
        items_formatted.append({
            "product_id": d.product_id,
            "quantity": d.quantity,
            "series_id": d.series_id,
            "detail_id": d.detail_id,
            "product_name": prod.name if prod else "Desconocido",
            "serial_number": serial_str
        })
    
    return {
        "transfer_id": transfer.transfer_id,
        "source_store_id": transfer.source_store_id,
        "target_store_id": transfer.target_store_id,
        "source_store_name": s_store.name if s_store else "Desconocido",
        "target_store_name": t_store.name if t_store else "Desconocido",
        "status": transfer.status,
        "user_request_name": u_req.username if u_req else "Desconocido",
        "date_requested": transfer.date_requested,
        "date_dispatched": transfer.date_dispatched,
        "date_received": transfer.date_received,
        "items": items_formatted
    }
