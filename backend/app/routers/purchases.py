from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import datetime
import io

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.purchase_model import PurchaseOrder, PurchaseOrderDetail, Purchase, PurchaseDetail
from app.models.product_model import Product, Inventory
from app.models.supplier_model import Supplier
from app.models.user_model import User
from app.models.inventory_movement_model import InventoryMovement
from app.models.product_model import ProductSeries
from app.schemas.purchase_order_schema import PurchaseOrderCreate, PurchaseOrderResponse, POReceiveWithImeis

router = APIRouter()

# ==========================================
# 1. CREAR ORDEN DE COMPRA (PENDIENTE)
# ==========================================
@router.post("/orders", response_model=PurchaseOrderResponse)
def create_purchase_order(
    po_data: PurchaseOrderCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Validar proveedor
    supplier = db.query(Supplier).filter(Supplier.supplier_id == po_data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # Calcular total y preparar detalles
    total_amount = 0.0
    
    new_po = PurchaseOrder(
        supplier_id=po_data.supplier_id,
        user_id=current_user.user_id,
        expected_date=po_data.expected_date,
        notes=po_data.notes,
        status="PENDIENTE"
    )
    db.add(new_po)
    db.flush() # Para obtener po_id
    
    for item in po_data.items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Producto ID {item.product_id} no encontrado")
            
        subtotal = item.quantity * item.unit_cost
        total_amount += subtotal
        
        detail = PurchaseOrderDetail(
            po_id=new_po.po_id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            subtotal=subtotal
        )
        db.add(detail)

    new_po.total_amount = total_amount
    db.commit()
    db.refresh(new_po)
    
    # Formatear respuesta (agregando nombres que pide el schema)
    return _format_po_response(new_po, db)

# ==========================================
# 2. LISTAR ÓRDENES DE COMPRA
# ==========================================
@router.get("/orders", response_model=List[PurchaseOrderResponse])
def list_purchase_orders(db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).order_by(desc(PurchaseOrder.date_created)).all()
    return [_format_po_response(o, db) for o in orders]

@router.get("/orders/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.po_id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
    return _format_po_response(po, db)

# ==========================================
# 3. RECIBIR ORDEN DE COMPRA (INGRESO A INVENTARIO)
# ==========================================
@router.put("/orders/{po_id}/receive")
def receive_purchase_order(
    po_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.po_id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
        
    if po.status != "PENDIENTE":
        raise HTTPException(status_code=400, detail="La orden de compra ya fue procesada o anulada.")

    # Al recibir la mercadería, actualizamos status
    po.status = "RECIBIDO"
    
    # Aquí podríamos transferir toda la OC a un 'Purchase' real y crear ingresos
    # Por mantener la trazabilidad, creamos el Purchase
    new_purchase = Purchase(
        supplier_id=po.supplier_id,
        user_id=current_user.user_id,
        document_type="ORDEN_COMPRA",
        document_number=f"OC-{po.po_id}",
        total_amount=po.total_amount,
        notes=f"Derivado de OC #{po.po_id}"
    )
    db.add(new_purchase)
    db.flush()

    # Procesar detalles para ingresar al inventario
    for detail in po.details:
        # Se agrega el detalle a la compra oficial
        purchase_detail = PurchaseDetail(
            purchase_id=new_purchase.purchase_id,
            product_id=detail.product_id,
            quantity=detail.quantity,
            unit_cost=detail.unit_cost,
            subtotal=detail.subtotal
        )
        db.add(purchase_detail)

        # Actualizar stock en Almacén o Tienda asignada
        # Para el ERP base, se ingresa al current_user.store_id como almacén de recepción
        inventory = db.query(Inventory).filter(
            Inventory.product_id == detail.product_id,
            Inventory.store_id == current_user.store_id
        ).first()

        product = db.query(Product).filter(Product.product_id == detail.product_id).first()
        
        # OJO: Serializables requerirían ingresar IMEIs individualmente.
        # En esta versión simplificada de "receive simple", asumimos productos generales
        # Si son serializados, el admin debería usar la interfaz regular de "Ingreso Mercadería".
        # Vamos a bloquear la recepción en bloque si hay serializados por seguridad:
        if product.is_serializable:
            db.rollback()
            raise HTTPException(
                status_code=400, 
                detail=f"El producto {product.name} es seriado. Debe ingresarse vía Inventario -> Ingreso manual de mercadería."
            )

        if inventory:
            # Nuevo costo promedio promediado
            old_qty = inventory.quantity
            old_cost = product.average_cost or 0
            new_qty = detail.quantity
            new_cost = detail.unit_cost
            
            if (old_qty + new_qty) > 0:
                avg_cost = ((old_qty * old_cost) + (new_qty * new_cost)) / (old_qty + new_qty)
                product.average_cost = avg_cost
                
            inventory.quantity += detail.quantity
        else:
            new_inv = Inventory(
                product_id=detail.product_id,
                store_id=current_user.store_id,
                quantity=detail.quantity
            )
            db.add(new_inv)
            product.average_cost = detail.unit_cost # Primer costo

        # Kardex
        kardex_mov = InventoryMovement(
            product_id=detail.product_id,
            user_id=current_user.user_id,
            store_id=current_user.store_id,
            type="ENTRADA",
            reason=f"Compra/Ingreso por OC #{po.po_id}",
            quantity=detail.quantity,
            unit_cost=detail.unit_cost
        )
        db.add(kardex_mov)
        
    db.commit()
    return {"message": "Orden de compra recibida. Inventario y Kardex actualizados."}

# ==========================================
# 3.5. RECIBIR ORDEN DE COMPRA (CON IMEIS)
# ==========================================
@router.post("/orders/{po_id}/receive-with-imeis")
def receive_purchase_order_with_imeis(
    po_id: int,
    payload: POReceiveWithImeis,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.po_id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")
        
    if po.status != "PENDIENTE":
        raise HTTPException(status_code=400, detail="La orden de compra ya fue procesada o anulada.")

    # 1. Validar que la cantidad de IMEIS enviada coincide con el pedido para los productos seriados
    serials_map = {item.product_id: item.serials for item in payload.items}
    
    for detail in po.details:
        if detail.product.is_serializable:
            provided_serials = serials_map.get(detail.product_id, [])
            if len(provided_serials) != detail.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Debe proporcionar exactamente {detail.quantity} IMEIs para el producto '{detail.product.name}'. Proporcionados: {len(provided_serials)}"
                )

    # 2. Iniciar ingreso oficial (Convertimos a Purchase real)
    po.status = "RECIBIDO"
    new_purchase = Purchase(
        supplier_id=po.supplier_id,
        user_id=current_user.user_id,
        document_type="ORDEN_COMPRA",
        document_number=f"OC-{po.po_id}",
        total_amount=po.total_amount,
        notes=f"Derivado de OC #{po.po_id} con ingreso de IMEIs"
    )
    db.add(new_purchase)
    db.flush()

    # 3. Procesar cada detalle
    for detail in po.details:
        # A) Registro Cabecera->Detalle
        purchase_detail = PurchaseDetail(
            purchase_id=new_purchase.purchase_id,
            product_id=detail.product_id,
            quantity=detail.quantity,
            unit_cost=detail.unit_cost,
            subtotal=detail.subtotal
        )
        db.add(purchase_detail)

        product = detail.product
        
        # B) Producto Seriado
        if product.is_serializable:
            serials_to_add = serials_map.get(detail.product_id, [])
            group_identifier = f"BUY_{new_purchase.purchase_id}_PROD_{detail.product_id}"
            
            for serial in serials_to_add:
                # Comprobar duplicado
                if db.query(ProductSeries).filter(ProductSeries.serial_number == serial).first():
                    db.rollback()
                    raise HTTPException(status_code=400, detail=f"El IMEI {serial} ya existe en el sistema.")
                
                new_serie = ProductSeries(
                    product_id=detail.product_id,
                    store_id=current_user.store_id,
                    serial_number=serial,
                    cost=detail.unit_cost,
                    status="disponible"
                )
                db.add(new_serie)
                db.flush()

                # Kardex Individual
                kardex_mov = InventoryMovement(
                    product_id=detail.product_id,
                    user_id=current_user.user_id,
                    store_id=current_user.store_id,
                    series_id=new_serie.series_id,
                    group_id=group_identifier,
                    type="ENTRADA",
                    reason=f"Compra/Ingreso por OC #{po.po_id}",
                    quantity=1,
                    unit_cost=detail.unit_cost
                )
                db.add(kardex_mov)
                
        # C) Producto Normal
        else:
            inventory = db.query(Inventory).filter(
                Inventory.product_id == detail.product_id,
                Inventory.store_id == current_user.store_id
            ).first()
            
            # Promediar
            old_qty = inventory.quantity if inventory else 0
            old_cost = product.average_cost or 0
            new_qty = detail.quantity
            new_cost = detail.unit_cost
            if (old_qty + new_qty) > 0:
                avg_cost = ((old_qty * old_cost) + (new_qty * new_cost)) / (old_qty + new_qty)
                product.average_cost = avg_cost
                
            if inventory:
                inventory.quantity += detail.quantity
            else:
                new_inv = Inventory(
                    product_id=detail.product_id,
                    store_id=current_user.store_id,
                    quantity=detail.quantity
                )
                db.add(new_inv)

            # Kardex Normal
            kardex_mov = InventoryMovement(
                product_id=detail.product_id,
                user_id=current_user.user_id,
                store_id=current_user.store_id,
                type="ENTRADA",
                reason=f"Compra OC #{po.po_id}",
                quantity=detail.quantity,
                unit_cost=detail.unit_cost
            )
            db.add(kardex_mov)
            
    db.commit()
    return {"message": "Orden de compra con IMEIs recibida exitosamente."}

# ==========================================
# 4. GENERAR PDF DE ORDEN DE COMPRA
# ==========================================
@router.get("/orders/{po_id}/pdf")
def generate_po_pdf(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.po_id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Orden de compra no encontrada")

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # ------------------
    # CABECERA (LOGO Y TÍTULO)
    # ------------------
    # Try logic if we had a logo -> c.drawImage(ImageReader("logo.png"), ...)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(20*mm, height - 25*mm, "SMART PE - ORDEN DE COMPRA")
    
    c.setFont("Helvetica", 12)
    c.drawString(20*mm, height - 35*mm, f"Nro. Orden: OC-{po.po_id:04d}")
    c.drawString(20*mm, height - 42*mm, f"Fecha Emisión: {po.date_created.strftime('%Y-%m-%d %H:%M')}")
    c.drawString(20*mm, height - 49*mm, f"Estado: {po.status}")
    if po.expected_date:
        c.drawString(20*mm, height - 56*mm, f"Entrega Esperada: {po.expected_date.strftime('%Y-%m-%d')}")
    
    # ------------------
    # DATOS PROVEEDOR
    # ------------------
    c.setFont("Helvetica-Bold", 12)
    c.drawString(100*mm, height - 35*mm, "Datos del Proveedor:")
    c.setFont("Helvetica", 10)
    c.drawString(100*mm, height - 42*mm, f"Nombre: {po.supplier.name}")
    c.drawString(100*mm, height - 48*mm, f"RUC: {po.supplier.ruc or '-'}")
    c.drawString(100*mm, height - 54*mm, f"Contacto: {po.supplier.contact_name or '-'}")
    c.drawString(100*mm, height - 60*mm, f"Teléfono: {po.supplier.phone or '-'}")

    # ------------------
    # TABLA DE DETALLES
    # ------------------
    y = height - 80*mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20*mm, y, "CÓDIGO/PRODUCTO")
    c.drawString(120*mm, y, "CANTIDAD")
    c.drawString(145*mm, y, "P. UNITARIO")
    c.drawString(175*mm, y, "SUBTOTAL")
    
    c.line(20*mm, y - 2*mm, 195*mm, y - 2*mm)
    y -= 8*mm
    
    c.setFont("Helvetica", 10)
    for detail in po.details:
        c.drawString(20*mm, y, detail.product.name[:45])  # truncar si es muy largo
        c.drawString(125*mm, y, str(detail.quantity))
        c.drawString(145*mm, y, f"S/ {detail.unit_cost:.2f}")
        c.drawString(175*mm, y, f"S/ {detail.subtotal:.2f}")
        y -= 6*mm
        if y < 40*mm:  # Control de nueva página por si hay muchos items
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - 20*mm
            
    c.line(20*mm, y - 2*mm, 195*mm, y - 2*mm)
    
    # ------------------
    # TOTALES Y NOTAS
    # ------------------
    y -= 10*mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(140*mm, y, "TOTAL OC:")
    c.drawString(170*mm, y, f"S/ {po.total_amount:.2f}")

    if po.notes:
        y -= 15*mm
        c.setFont("Helvetica-Bold", 10)
        c.drawString(20*mm, y, "NOTAS Y CONDICIONES:")
        c.setFont("Helvetica", 9)
        c.drawString(20*mm, y - 6*mm, po.notes)
        
    c.setFont("Helvetica", 8)
    c.drawString(20*mm, 15*mm, "Documento interno de solicitud de compra. Generado por SMART PE.")

    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=Orden_Compra_{po.po_id}.pdf"}
    )
    
# Helpers
def _format_po_response(po: PurchaseOrder, db: Session):
    return {
        "po_id": po.po_id,
        "supplier_id": po.supplier_id,
        "user_id": po.user_id,
        "expected_date": po.expected_date,
        "notes": po.notes,
        "status": po.status,
        "total_amount": po.total_amount,
        "date_created": po.date_created,
        "supplier_name": po.supplier.name if po.supplier else "Desconocido",
        "user_name": po.user.username if po.user else "Desconocido",
        "details": [
            {
                "product_id": d.product_id,
                "quantity": d.quantity,
                "unit_cost": d.unit_cost,
                "subtotal": d.subtotal,
                "detail_id": d.detail_id,
                "product_name": d.product.name if d.product else "Desconocido"
            } for d in po.details
        ]
    }
