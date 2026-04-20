import qrcode
from reportlab.lib.utils import ImageReader
from num2words import num2words
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import landscape, portrait
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
import io
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from app.services.sunat.emission_service import process_sunat_emission

# Imports Core
from app.core.database import get_db
from app.dependencies import get_current_user

# Imports Modelos
from app.models.product_model import Product, ProductSeries, Inventory
from app.models.sale_model import Sale, SaleDetail, SalePayment
from app.models.user_model import User
from app.models.client_model import Client
from app.models.loyalty_model import LoyaltyTransaction
from app.models.inventory_movement_model import InventoryMovement  # 📜 KARDEX

# Imports Esquemas
from app.schemas.sale_schema import SaleCreate, SaleResponse, SaleHistoryResponse

router = APIRouter()

# ==========================================
# 🛒 PROCESAR VENTA (CHECKOUT)
# ==========================================
from app.routers.cash import get_active_register



@router.post("/sales/checkout", response_model=SaleResponse)
def process_sale(sale_data: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    # 0. Validación de Caja Abierta
    # Solo validamos si es CAJERO o ADMIN que vende (aunque Admin debería poder vender siempre, mejor forzar arqueo)
    active_register = get_active_register(db, current_user.user_id)
    if not active_register:
         raise HTTPException(status_code=403, detail="Debes ABRIR CAJA antes de realizar ventas.")

    # 1. Validación de Permisos de Tienda
    if current_user.store_id != sale_data.store_id:
         raise HTTPException(status_code=403, detail="No tienes permiso para vender en esta tienda.")

    # 2. Buscar Cliente (Si se envió DNI)
    client_obj = None
    if sale_data.client_dni:
        client_obj = db.query(Client).filter(Client.document_number == sale_data.client_dni).first()

    # 3. Determinar tipo de comprobante automáticamente
    # Regla SUNAT: DNI (8 dígitos) → BOLETA | RUC (11 dígitos) → FACTURA
    invoice_type = "BOLETA"
    if client_obj and client_obj.document_number:
        doc_num = (client_obj.document_number or "").strip()
        if len(doc_num) == 11 and doc_num.isdigit():
            invoice_type = "FACTURA"

    # 4. Crear Cabecera de Venta
    new_sale = Sale(
        store_id=sale_data.store_id,
        user_id=current_user.user_id,
        client_id=client_obj.client_id if client_obj else None,
        total_amount=0,
        discount_amount=sale_data.discount_amount or 0,
        net_amount=0,
        invoice_type=invoice_type,
        sunat_status='PENDIENTE',
        points_earned=0,
        promotion_id=sale_data.promotion_id
    )
    db.add(new_sale)
    db.flush()

    total_sale = 0

    # 4. Procesar Items (Productos)
    for item in sale_data.items:
        # A. Obtener Producto
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")

        current_price = product.base_price
        subtotal = current_price * item.quantity
        series_linked_id = None

        # B. Lógica IMEI (Para Celulares)
        if item.serial_number:
            serie_obj = db.query(ProductSeries).filter(
                ProductSeries.serial_number == item.serial_number,
                ProductSeries.product_id == item.product_id
            ).first()

            if not serie_obj: 
                db.rollback()
                raise HTTPException(status_code=404, detail=f"IMEI {item.serial_number} no existe.")

            if serie_obj.status == "vendido":
                db.rollback()
                raise HTTPException(status_code=400, detail=f"IMEI {item.serial_number} YA FUE VENDIDO.")
            
            if serie_obj.store_id != sale_data.store_id:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"IMEI {item.serial_number} está en otra tienda.")

            # Marcar como vendido
            serie_obj.status = "vendido"
            series_linked_id = serie_obj.series_id

        # C. Lógica Stock General (Accesorios)
        else:
            inventory_item = db.query(Inventory).filter(
                Inventory.product_id == item.product_id,
                Inventory.store_id == sale_data.store_id
            ).first()

            if not inventory_item or inventory_item.quantity < item.quantity:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.name}")
            
            inventory_item.quantity -= item.quantity

        # D. Guardar Detalle
        detail = SaleDetail(
            sale_id=new_sale.sale_id,
            product_id=item.product_id,
            series_id=series_linked_id,
            quantity=item.quantity,
            unit_price=current_price,
            subtotal=subtotal
        )
        db.add(detail)
        total_sale += subtotal

        # 📜 E. REGISTRAR EN KARDEX (SALIDA POR VENTA - AGRUPADA)
        group_identifier = f"SALE_{new_sale.sale_id}_PROD_{item.product_id}"
        
        kardex_mov = InventoryMovement(
            product_id=item.product_id,
            user_id=current_user.user_id,
            store_id=sale_data.store_id,
            series_id=series_linked_id,
            group_id=group_identifier, # Agrupador para consolidar en el frontend
            type="SALIDA",
            reason=f"Venta #{new_sale.sale_id}",
            quantity=item.quantity, # Esto será 1 para series, pero el endpoint detail sumará todos los del grupo
            unit_cost=product.average_cost or 0,
            date=datetime.now()
        )
        db.add(kardex_mov)

    # 5. Registrar el Pago
    new_payment = SalePayment(
        sale_id=new_sale.sale_id,
        method=sale_data.payment_method,
        amount=total_sale,  # TODO: Podría guardar el received o dejar solo lo cobrado real
        reference_code=sale_data.payment_reference
    )
    db.add(new_payment)

    # 6. Actualizar Totales y Finalizar
    new_sale.total_amount = total_sale  # Subtotal (antes de descuento)
    
    # Calcular total neto (después del descuento)
    descuento_promo = float(sale_data.discount_amount or 0)
    descuento_puntos = float(sale_data.points_discount_amount or 0)
    
    # Validar Puntos Disponibles
    if sale_data.points_used and sale_data.points_used > 0:
        if not client_obj:
             raise HTTPException(status_code=400, detail="Se requiere cliente para usar puntos.")
        if (client_obj.current_points or 0) < sale_data.points_used:
             raise HTTPException(status_code=400, detail="Puntos insuficientes.")
    
    net_total = total_sale - descuento_promo - descuento_puntos
    
    # 🛡️ VALIDACIÓN PREVENTIVA SUNAT (BACKEND)
    # SUNAT exige que compras mayores a 700 soles tengan DNI/RUC
    if net_total > 700 and not client_obj:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="⚠️ RECHAZO SUNAT PREVENTIVO: Por normativa, toda venta mayor a S/ 700.00 requiere identificar obligatoriamente al cliente con DNI o RUC."
        )

    new_sale.net_amount = net_total
    new_sale.points_used = sale_data.points_used
    
    # Cálculo de Puntos (sobre el neto pagado, 1 punto x S/10)
    # IMPORTANTE: No se ganan puntos sobre la parte pagada con puntos (net_total ya lo excluye)
    points_to_add = int(net_total / 10)
    new_sale.points_earned = points_to_add
    
    # ACTUALIZAR PUNTOS DEL CLIENTE SI EXISTE
    if client_obj:
        current_pts = client_obj.current_points or 0
        
        # 🔻 REDENCIÓN (REDEEM)
        if sale_data.points_used and sale_data.points_used > 0:
            current_pts -= sale_data.points_used
            
            # Registrar uso de puntos
            loyalty_redeem = LoyaltyTransaction(
                client_id=client_obj.client_id,
                points=-sale_data.points_used,
                type='REDEEM',
                reason=f'Canje en Venta #{new_sale.sale_id}',
                sale_id=new_sale.sale_id,
                created_at=datetime.now()
            )
            db.add(loyalty_redeem)

        # 🔺 ACUMULACIÓN (EARN)
        if points_to_add > 0:
            current_pts += points_to_add
            
            # Registrar ganancia de puntos
            loyalty_earn = LoyaltyTransaction(
                client_id=client_obj.client_id,
                points=points_to_add,
                type='EARN',
                reason=f'Compra #{new_sale.sale_id}',
                sale_id=new_sale.sale_id,
                created_at=datetime.now()
            )
            db.add(loyalty_earn)
            
        client_obj.current_points = current_pts

    db.commit()
    db.refresh(new_sale)

    # 🚀 Emitir a SUNAT de forma SÍNCRONA
    # El checkout espera la respuesta de NubeFact antes de responder al frontend.
    # Así el ticket impreso siempre lleva el número real de comprobante.
    from app.services.sunat.nubefact_service import emit_to_nubefact
    try:
        result = emit_to_nubefact(new_sale, db)
        if result.get("success"):
            new_sale.sunat_status   = "ACEPTADO"
            new_sale.invoice_series = result.get("invoice_series", "")
            new_sale.invoice_number = result.get("invoice_number", str(new_sale.sale_id))
            new_sale.hash_cpe       = result.get("hash_cpe", "")
            new_sale.xml_url        = result.get("enlace_pdf", "")
        else:
            new_sale.sunat_status = "ERROR_SUNAT"
            logger.error(f"🚨 NubeFact rechazó Venta #{new_sale.sale_id}: {result.get('error_msg')}")
        db.commit()
        db.refresh(new_sale)
    except Exception as e:
        logger.error(f"❌ Error crítico emitiendo Venta #{new_sale.sale_id}: {e}")
        new_sale.sunat_status = "ERROR_SUNAT"
        db.commit()

    return {
        "sale_id":        new_sale.sale_id,
        "total_amount":   float(new_sale.total_amount),
        "net_amount":     float(new_sale.net_amount),
        "status":         "completado",
        "sunat_status":   new_sale.sunat_status,
        "invoice_type":   new_sale.invoice_type,
        "invoice_series": new_sale.invoice_series or "",
        "invoice_number": new_sale.invoice_number or "",
    }

# ==========================================
# GESTIÓN DE HISTORIAL DE VENTAS
# ==========================================
@router.get("/sales/history", response_model=List[SaleHistoryResponse])
def get_sales_history(store_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Filtro por tienda: Admins pueden override con store_id param
    effective_store_id = store_id if store_id is not None else current_user.store_id
    from sqlalchemy.orm import joinedload
    sales = db.query(Sale).filter(
        Sale.store_id == effective_store_id
    ).options(
        joinedload(Sale.client),
        joinedload(Sale.user),
        joinedload(Sale.payments),
        joinedload(Sale.details).joinedload(SaleDetail.product),
        joinedload(Sale.details).joinedload(SaleDetail.series)
    ).order_by(Sale.date_created.desc()).all()
    
    history_data = []
    
    for sale in sales:
        details_data = []
        for detail in sale.details:
            details_data.append({
                "product_id": detail.product_id,
                "product_name": detail.product.name if detail.product else "Desconocido",
                "quantity": detail.quantity,
                "unit_price": detail.unit_price,
                "subtotal": detail.subtotal,
                "serial_number": detail.series.serial_number if detail.series else None
            })

        history_data.append({
            "sale_id": sale.sale_id,
            "date_created": sale.date_created,
            "total_amount": sale.total_amount,
            "payment_method": sale.payments[0].method if sale.payments else "Desconocido", 
            "client_dni": sale.client.document_number if sale.client else None, 
            "user_name": sale.user.username if sale.user else "Admin",
            "details": details_data,
            "sunat_status": sale.sunat_status,
            "invoice_type": sale.invoice_type,
            "xml_url": sale.xml_url
        })
        
    return history_data

# ==========================================
# 📜 HISTORIAL DE VENTAS (PAGINADO)
# ==========================================
@router.get("/sales/history-paginated")
def get_sales_history_paginated(
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    payment_method: Optional[str] = None,
    user_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Historial de ventas con paginación y filtros del lado del servidor."""
    import math
    from sqlalchemy import or_, cast, String
    from datetime import datetime as dt
    
    effective_store_id = store_id if store_id is not None else current_user.store_id
    
    query = db.query(Sale).filter(Sale.store_id == effective_store_id)
    
    # Filtro por búsqueda (ticket # o DNI cliente)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                cast(Sale.sale_id, String).ilike(search_term),
                Sale.client_id.in_(
                    db.query(Client.client_id).filter(Client.document_number.ilike(search_term))
                )
            )
        )
    
    # Filtro por método de pago
    if payment_method and payment_method != "TODOS":
        from app.models.sale_model import SalePayment
        sale_ids_with_method = db.query(SalePayment.sale_id).filter(
            SalePayment.method == payment_method
        ).distinct()
        query = query.filter(Sale.sale_id.in_(sale_ids_with_method))
    
    # Filtro por usuario/cajero
    if user_name and user_name != "TODOS":
        user_ids = db.query(User.user_id).filter(User.username == user_name)
        query = query.filter(Sale.user_id.in_(user_ids))
    
    # Filtro por rango de fechas
    if start_date:
        try:
            sd = dt.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Sale.date_created >= sd)
        except ValueError:
            pass
    if end_date:
        try:
            ed = dt.strptime(end_date, "%Y-%m-%d")
            ed = ed.replace(hour=23, minute=59, second=59)
            query = query.filter(Sale.date_created <= ed)
        except ValueError:
            pass
    
    # Contar total y paginar
    total_items = query.count()
    total_pages = math.ceil(total_items / limit) if total_items > 0 else 1
    
    from sqlalchemy.orm import joinedload

    sales = query.options(
        joinedload(Sale.client),
        joinedload(Sale.user),
        joinedload(Sale.payments),
        joinedload(Sale.details).joinedload(SaleDetail.product),
        joinedload(Sale.details).joinedload(SaleDetail.series)
    ).order_by(Sale.date_created.desc()).offset((page - 1) * limit).limit(limit).all()
    
    # Construir respuesta extrayendo de la jerarquía ya cargada
    history_data = []
    for sale in sales:
        details_data = []
        for detail in sale.details:
            details_data.append({
                "product_id": detail.product_id,
                "product_name": detail.product.name if detail.product else "Desconocido",
                "quantity": detail.quantity,
                "unit_price": detail.unit_price,
                "subtotal": detail.subtotal,
                "serial_number": detail.series.serial_number if detail.series else None
            })

        history_data.append({
            "sale_id": sale.sale_id,
            "date_created": sale.date_created.isoformat() if sale.date_created else None,
            "total_amount": float(sale.total_amount),
            "payment_method": sale.payments[0].method if sale.payments else "Desconocido", 
            "client_dni": sale.client.document_number if sale.client else None, 
            "client_name": sale.client.first_name if sale.client else None, 
            "user_name": sale.user.username if sale.user else "Admin",
            "details": details_data,
            "sunat_status": sale.sunat_status,
            "invoice_type": sale.invoice_type,
            "invoice_series": sale.invoice_series,
            "invoice_number": sale.invoice_number,
            "xml_url": sale.xml_url
        })
    
    return {
        "data": history_data,
        "page": page,
        "total_pages": total_pages,
        "total_items": total_items
    }

# ==========================================
# 🚫 ANULAR VENTA (NOTA DE CRÉDITO)
# ==========================================
from app.schemas.sale_schema import VoidSaleRequest

@router.post("/sales/{sale_id}/void")
def void_sale(sale_id: int, void_data: VoidSaleRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Buscar Venta Original
    original_sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
    if not original_sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    # 🔒 SEGURIDAD MULTI-TIENDA
    if original_sale.store_id != current_user.store_id:
        raise HTTPException(status_code=403, detail="No puedes anular ventas de otra tienda.")

    if original_sale.sunat_status != "ACEPTADO":
        raise HTTPException(status_code=400, detail="Solo se pueden anular ventas ACEPTADAS por SUNAT.")
        
    # 2. Verificar si ya fue anulada
    already_voided = db.query(Sale).filter(Sale.related_sale_id == sale_id, Sale.invoice_type == "NC").first()
    if already_voided:
        raise HTTPException(status_code=400, detail=f"Esta venta ya fue anulada con la NC #{already_voided.invoice_number}")

    # 3. Crear Nota de Crédito en BD
    # Usamos montos positivos, pero el tipo 'NOTA_CREDITO' indica resta contable
    new_nc = Sale(
        store_id=original_sale.store_id,
        user_id=current_user.user_id,
        client_id=original_sale.client_id,
        total_amount=original_sale.total_amount,
        discount_amount=original_sale.discount_amount,
        net_amount=original_sale.net_amount,
        
        invoice_type='NC',
        sunat_status='PENDIENTE',
        related_sale_id=original_sale.sale_id,
        credit_note_reason=void_data.reason,
        points_earned=0 # No genera puntos
    )
    
    # 4. Revertir Puntos (Opcional, restar puntos generados)
    if original_sale.client_id and original_sale.points_earned > 0:
        client = db.query(Client).filter(Client.client_id == original_sale.client_id).first()
        if client:
             points_to_revert = original_sale.points_earned
             client.current_points = max(0, client.current_points - points_to_revert)
             
             # Registrar reversión de puntos
             loyalty_revert = LoyaltyTransaction(
                 client_id=client.client_id,
                 points=-points_to_revert, # Negativo para restar
                 type='ADJUST', # O Cancelación
                 reason=f'Anulación Venta #{original_sale.sale_id}',
                 sale_id=new_nc.sale_id, # Link a la NC
                 created_at=datetime.now()
             )
             db.add(loyalty_revert)

    # 4.1. Devolver Puntos Canjeados (Si se usaron puntos, devolverlos)
    if original_sale.client_id and original_sale.points_used > 0:
        client = db.query(Client).filter(Client.client_id == original_sale.client_id).first()
        if client:
             points_to_refund = original_sale.points_used
             client.current_points = (client.current_points or 0) + points_to_refund
             
             # Registrar devolución (refund)
             loyalty_refund = LoyaltyTransaction(
                 client_id=client.client_id,
                 points=points_to_refund, # Positivo para devolver
                 type='REFUND', 
                 reason=f'Devolución Canje Venta #{original_sale.sale_id}',
                 sale_id=new_nc.sale_id,
                 created_at=datetime.now()
             )
             db.add(loyalty_refund)

    db.add(new_nc)
    db.flush()  # Para obtener el ID de la NC

    # 4.2 📜 REVERTIR STOCK Y REGISTRAR EN KARDEX (DEVOLUCIÓN)
    for detail in original_sale.details:
        product = db.query(Product).filter(Product.product_id == detail.product_id).first()
        if not product:
            continue

        # Devolver serie si es serializable
        if detail.series_id:
            serie_obj = db.query(ProductSeries).filter(ProductSeries.series_id == detail.series_id).first()
            if serie_obj:
                serie_obj.status = "disponible"
        else:
            # Devolver stock general
            inventory_item = db.query(Inventory).filter(
                Inventory.product_id == detail.product_id,
                Inventory.store_id == original_sale.store_id
            ).first()
            if inventory_item:
                inventory_item.quantity += detail.quantity

        # Registrar ENTRADA en Kardex (AGRUPADA)
        group_identifier = f"VOID_{new_nc.sale_id}_PROD_{detail.product_id}"
        
        kardex_rev = InventoryMovement(
            product_id=detail.product_id,
            user_id=current_user.user_id,
            store_id=original_sale.store_id,
            series_id=detail.series_id,
            group_id=group_identifier,
            type="ENTRADA",
            reason=f"Anulación Venta #{original_sale.sale_id} (NC #{new_nc.sale_id})",
            quantity=detail.quantity,
            unit_cost=product.average_cost or 0,
            date=datetime.now()
        )
        db.add(kardex_rev)

    db.commit()
    db.refresh(new_nc)

    # 5. Emitir Nota de Crédito a SUNAT de forma SÍNCRONA
    from app.services.sunat.nubefact_service import emit_to_nubefact
    try:
        result = emit_to_nubefact(new_nc, db)
        if result.get("success"):
            new_nc.sunat_status   = "ACEPTADO"
            new_nc.invoice_series = result.get("invoice_series", "")
            new_nc.invoice_number = result.get("invoice_number", str(new_nc.sale_id))
            new_nc.hash_cpe       = result.get("hash_cpe", "")
            new_nc.xml_url        = result.get("enlace_pdf", "")
            # Marcar la venta original como ANULADO
            original_sale.sunat_status = "ANULADO"
        else:
            new_nc.sunat_status = "ERROR_SUNAT"
            logger.error(f"🚨 NubeFact rechazó NC #{new_nc.sale_id}: {result.get('error_msg')}")
        db.commit()
        db.refresh(new_nc)
    except Exception as e:
        logger.error(f"❌ Error crítico emitiendo NC #{new_nc.sale_id}: {e}")
        new_nc.sunat_status = "ERROR_SUNAT"
        db.commit()

    return {
        "message":        "Anulación procesada",
        "credit_note_id": new_nc.sale_id,
        "sunat_status":   new_nc.sunat_status,
        "invoice_series": new_nc.invoice_series or "",
        "invoice_number": new_nc.invoice_number or "",
    }


# ==========================================
# 🌐 EMITIR MANUALMENTE A SUNAT (REINTENTO)
# ==========================================
@router.post("/sales/{sale_id}/emit_sunat")
def emit_sale_to_sunat(sale_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.store_id != current_user.store_id and current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="No tienes permiso para esta operación.")

    if sale.sunat_status == "ACEPTADO":
        raise HTTPException(status_code=400, detail="Esta venta ya fue aceptada por SUNAT. No se puede re-emitir.")

    sale.sunat_status = "PENDIENTE"
    db.commit()

    background_tasks.add_task(process_sunat_emission, sale_id)
    return {"message": f"Re-emisión a SUNAT iniciada para Venta #{sale_id}", "status": "PENDIENTE"}


# ==========================================
# GENERACIÓN DE COMPROBANTES PDF (TICKET)
# ==========================================
@router.get("/sales/{sale_id}/ticket")
def generate_ticket_pdf(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    # Helper: formato de moneda con separador de miles
    def fmt(amount):
        return f"{amount:,.2f}"

    # Configuración Física
    width = 80 * mm
    items_count = len(sale.details)
    height = (230 + (items_count * 15)) * mm
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width, height))
    
    y = height - 5 * mm
    x = 4 * mm         
    w = width - 8 * mm  
    x_right = x + w     

    # --- 1. CABECERA ---
    # Obtener datos de Tienda y Usuario
    store = sale.store  # Asumiendo relación configurada en Sale model (si no, hacer query)
    if not store:
        from app.models.store_model import Store
        store = db.query(Store).filter(Store.store_id == sale.store_id).first()
    
    seller = sale.user # Asumiendo relación configurada
    if not seller:
        from app.models.user_model import User 
        seller = db.query(User).filter(User.user_id == sale.user_id).first()

    from app.models.setting_model import Setting
    settings_db = db.query(Setting).all()
    settings_dict = {s.key: s.value for s in settings_db}

    # Datos dinámicos consolidados de Tienda + Empresa
    company_name = settings_dict.get("company_name", "SMART PE S.A.C.")
    store_name = f"{company_name} | {store.name.upper()}" if store else company_name
    comp_address = settings_dict.get("company_address")
    store_address = comp_address if comp_address else (store.address or "Dirección no registrada")
    
    comp_phone = settings_dict.get("company_phone")
    store_phone = f"Telf: {comp_phone}" if comp_phone else (f"Telf: {store.phone}" if (store and store.phone) else "Telf: (01) 000-0000")
    
    comp_ruc = settings_dict.get("company_ruc")
    store_ruc = f"RUC: {comp_ruc}" if comp_ruc else (f"RUC: {store.ruc}" if (store and store.ruc) else "RUC: 20601234567")

    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(width / 2, y, store_name)
    y -= 5 * mm
    
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, y, store_ruc)
    y -= 3.5 * mm
    c.drawCentredString(width / 2, y, store_address)
    y -= 3.5 * mm
    c.drawCentredString(width / 2, y, f"{store_phone}")
    y -= 5 * mm
    
    c.setStrokeColorRGB(0, 0, 0)
    c.setLineWidth(0.5)
    c.line(x, y, x_right, y)
    y -= 5 * mm

    # --- 2. DATOS VENTA ---
    c.setFont("Helvetica-Bold", 10)
    
    titulo_doc = "BOLETA DE VENTA ELECTRÓNICA"
    if sale.invoice_type == "NC":
        titulo_doc = "NOTA DE CRÉDITO ELECTRÓNICA"
    elif sale.invoice_type == "FACTURA":
        titulo_doc = "FACTURA ELECTRÓNICA"
        
    c.drawCentredString(width / 2, y, titulo_doc)
    y -= 4 * mm
    
    serie = sale.invoice_series or "B001"
    numero_raw = sale.invoice_number or f"{sale.sale_id:08d}"
    # Formatear a 8 dígitos para que coincida con el PDF de NubeFact (BBB1-000005)
    try:
        numero = f"{int(numero_raw):08d}"
    except (ValueError, TypeError):
        numero = numero_raw
    
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, y, f"{serie}-{numero}")
    y -= 6 * mm

    # Si es NC, mostrar Referencia y Motivo
    if sale.invoice_type == "NC" and sale.related_sale_id:
        related = db.query(Sale).filter(Sale.sale_id == sale.related_sale_id).first()
        if related:
            ref_serie = related.invoice_series or "B001"
            ref_raw = related.invoice_number or f"{related.sale_id:08d}"
            try:
                ref_num = f"{int(ref_raw):08d}"
            except (ValueError, TypeError):
                ref_num = ref_raw
            
            c.setFont("Helvetica", 7)
            c.drawCentredString(width / 2, y, f"Ref: {ref_serie}-{ref_num}")
            y -= 3 * mm
            c.drawCentredString(width / 2, y, f"Motivo: {sale.credit_note_reason or '-'}")
            y -= 4 * mm

    c.setFont("Helvetica", 8)
    c.drawString(x, y, "FECHA: " + sale.date_created.strftime('%d/%m/%Y'))
    c.drawRightString(x_right, y, "HORA: " + sale.date_created.strftime('%H:%M'))
    y -= 4 * mm

    # VENDEDOR / CAJERO
    seller_name = seller.username.upper() if seller else "ADMIN"
    c.drawString(x, y, "VENDEDOR:")
    c.drawRightString(x_right, y, seller_name)
    y -= 4 * mm

    # Cliente (CORREGIDO)
    client_name = "PÚBLICO GENERAL"
    client_doc = "-"
    if sale.client_id:
        client = db.query(Client).filter(Client.client_id == sale.client_id).first()
        if client: 
            # ✅ CORRECCIÓN: Construimos el nombre completo y usamos document_number
            full_name = f"{client.first_name} {client.last_name or ''}".strip()
            client_name = full_name.upper()
            client_doc = client.document_number

    c.drawString(x, y, "CLIENTE:")
    c.drawRightString(x_right, y, client_name[:22]) 
    y -= 3.5 * mm
    c.drawString(x, y, "DNI/RUC:")
    c.drawRightString(x_right, y, client_doc)
    y -= 5 * mm

    c.line(x, y, x_right, y)
    y -= 4 * mm

    # --- 3. ITEMS (ENCABEZADOS) ---
    c.setFont("Helvetica-Bold", 7)
    col_cant = x
    col_desc = x + 8 * mm
    col_total = x_right
    
    c.drawString(col_cant, y, "CANT")
    c.drawString(col_desc, y, "DESCRIPCIÓN")
    c.drawRightString(col_total, y, "TOTAL")
    y -= 2 * mm
    c.line(x, y, x_right, y)
    y -= 4 * mm

    # --- ITEMS (FILAS) ---
    c.setFont("Helvetica", 7)
    for detail in sale.details:
        prod = db.query(Product).filter(Product.product_id == detail.product_id).first()
        p_name = prod.name[:25] if prod else "Item"
        
        c.drawString(col_cant, y, str(detail.quantity))
        c.drawString(col_desc, y, p_name)
        c.drawRightString(col_total, y, fmt(detail.subtotal))
        
        y -= 3.5 * mm
        
        if detail.series_id:
             serie_obj = db.query(ProductSeries).filter(ProductSeries.series_id == detail.series_id).first()
             if serie_obj:
                 c.setFont("Helvetica-Oblique", 6)
                 c.drawString(col_desc, y, f"SN: {serie_obj.serial_number}")
                 c.setFont("Helvetica", 7)
                 y -= 3.5 * mm
    
    y -= 2 * mm
    c.line(x, y, x_right, y)
    y -= 5 * mm

    # --- 4. TOTALES ---
    # Obtener valores de la venta
    total_bruto = float(sale.total_amount)  # Subtotal antes de descuento
    descuento = float(sale.discount_amount or 0)  # Monto descontado
    total_neto = float(sale.net_amount or total_bruto)  # Total después de descuento
    
    # Si no hay net_amount, el total neto es el bruto menos descuento
    if not sale.net_amount:
        total_neto = total_bruto - descuento
    
    # Calcular IGV (18%) sobre el total neto
    base_imponible = total_neto / 1.18
    igv = total_neto - base_imponible

    x_label = x + 25 * mm
    x_symbol = x + 52 * mm
    x_amount = x_right

    c.setFont("Helvetica", 8)
    
    # SUBTOTAL (antes de descuento)
    c.drawRightString(x_symbol - 2*mm, y, "SUBTOTAL:") 
    c.drawString(x_symbol, y, "S/")
    c.drawRightString(x_amount, y, fmt(total_bruto))
    y -= 4 * mm
    
    # DESCUENTO (solo si hay)
    if descuento > 0:
        c.setFont("Helvetica", 8)
        c.drawRightString(x_symbol - 2*mm, y, "DESCUENTO:") 
        c.drawString(x_symbol, y, "S/")
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(x_amount, y, f"-{fmt(descuento)}")
        c.setFont("Helvetica", 8)
        y -= 4 * mm
    
    c.drawRightString(x_symbol - 2*mm, y, "OP. GRAVADA:") 
    c.drawString(x_symbol, y, "S/")
    c.drawRightString(x_amount, y, fmt(base_imponible))
    y -= 4 * mm
    
    c.drawRightString(x_symbol - 2*mm, y, "I.G.V. (18%):")
    c.drawString(x_symbol, y, "S/")
    c.drawRightString(x_amount, y, fmt(igv))
    y -= 4 * mm
    
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(x_symbol - 2*mm, y, "TOTAL:")
    c.drawString(x_symbol, y, "S/")
    c.drawRightString(x_amount, y, fmt(total_neto))
    y -= 6 * mm

    c.setFont("Helvetica", 6.5)
    try:
        monto_letras = num2words(total_neto, lang='es').upper()
    except:
        monto_letras = "MONTO"
        
    c.drawString(x, y, f"SON: {monto_letras} CON 00/100 SOLES")
    y -= 4 * mm

    c.line(x, y, x_right, y)
    y -= 2 * mm

    # --- 5. HASH CPE Y QR (SI ES ACEPTADO) ---
    y -= 2 * mm
    
    if sale.sunat_status == "ACEPTADO" and sale.hash_cpe:
        # Texto Hash
        c.setFont("Helvetica", 7)
        c.drawCentredString(width / 2, y, f"Resumen: {sale.hash_cpe}")
        y -= 4 * mm

        # Datos QR SUNAT: RUC | TIPO | SERIE | NUMERO | IGV | TOTAL | FECHA | TIPO_DOC | NUM_DOC
        tipo_doc_venta = "01" if sale.invoice_type == "FACTURA" else "03"
        if sale.invoice_type == 'NC':
            tipo_doc_venta = "07"
            
        tipo_doc_cliente = "1" if len(client_doc) == 8 else "6" if len(client_doc) == 11 else "-"
        
        qr_content = (
            f"20601234567|{tipo_doc_venta}|{serie}|{numero}|{igv:.2f}|{total_neto:.2f}|"
            f"{sale.date_created.strftime('%d/%m/%Y')}|{tipo_doc_cliente}|{client_doc}"
        )
        
        qr = qrcode.make(qr_content)
        qr_img = ImageReader(qr.get_image())
        
        qr_size = 25 * mm
        c.drawImage(qr_img, (width - qr_size) / 2, y - qr_size - 2*mm, width=qr_size, height=qr_size)
        y -= (qr_size + 6*mm)
        
        c.setFont("Helvetica", 7)
        c.drawCentredString(width / 2, y, "Representación Impresa de la Boleta Electrónica")
        y -= 3 * mm
        c.drawCentredString(width / 2, y, "Consulte su documento en www.smartpe.com")

    elif sale.sunat_status == "PENDIENTE":
        y -= 5 * mm
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(width / 2, y, "COMPROBANTE PENDIENTE DE ENVÍO A SUNAT")
        y -= 4 * mm
        c.setFont("Helvetica", 7)
        c.drawCentredString(width / 2, y, "Se procesará automáticamente en breve.")

    else: # Rechazado o Error
        y -= 5 * mm
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(width / 2, y, "COMPROBANTE SIN VALIDEZ FISCAL")
        y -= 4 * mm
        c.setFont("Helvetica", 7)
        c.drawCentredString(width / 2, y, f"Estado SUNAT: {sale.sunat_status}")

    y -= 5 * mm
    ticket_footer = settings_dict.get("ticket_footer", "Gracias por su preferencia")
    c.drawCentredString(width / 2, y, ticket_footer)
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=ticket_{sale_id}.pdf"}
    )