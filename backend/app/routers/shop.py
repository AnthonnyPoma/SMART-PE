from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc
from typing import List, Optional
from app.core.database import get_db
from app.models import product_model, web_order_model, client_model
from app.dependencies import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# Estados válidos de un pedido web
VALID_STATUSES = ["PENDIENTE", "PAGADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO", "CANCELADO"]

# DTOs
class CartItem(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[float] = None  # Opcional, se toma de la BD si no viene

class CheckoutRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    customer_document: Optional[str] = None
    shipping_address: Optional[str] = None
    total_amount: Optional[float] = None
    items: List[CartItem]

class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

@router.get("/categories")
def get_public_categories(db: Session = Depends(get_db)):
    # Devuelve el árbol de categorías (Mega Menú)
    categories = db.query(product_model.Category).all()
    
    # Armar jerarquía en memoria para enviarla limpia al frontend
    cat_dict = {}
    for c in categories:
        cat_dict[c.category_id] = {
            "id": c.category_id,
            "name": c.name,
            "parent_id": c.parent_id,
            "subcategories": []
        }
    
    tree = []
    for c_id, c_data in cat_dict.items():
        if c_data["parent_id"]:
            # Es subcategoría
            if c_data["parent_id"] in cat_dict:
                cat_dict[c_data["parent_id"]]["subcategories"].append(c_data)
        else:
            # Es categoría raíz (Familia)
            tree.append(c_data)
            
    return tree

@router.get("/products")
def get_public_products(
    search: Optional[str] = None, 
    category_id: Optional[int] = None, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    query = db.query(product_model.Product)
    if search:
        query = query.filter(product_model.Product.name.ilike(f"%{search}%"))
    if category_id:
        all_categories = db.query(product_model.Category).all()
        target_ids = {category_id}
        
        changed = True
        while changed:
            changed = False
            for cat in all_categories:
                if cat.parent_id in target_ids and cat.category_id not in target_ids:
                    target_ids.add(cat.category_id)
                    changed = True
                    
        query = query.filter(product_model.Product.category_id.in_(target_ids))
        
    products = query.limit(limit).all()
    return products

@router.get("/products/{product_id}")
def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    product = db.query(product_model.Product).filter(product_model.Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product

@router.post("/checkout")
def process_web_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    if not req.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    total_amount = 0
    order_items = []

    # Validar stock y calcular total
    for item in req.items:
        product = db.query(product_model.Product).filter(product_model.Product.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto con ID {item.product_id} no encontrado")
        
        # Aquí idealmente consultaríamos Inventory para ver stock real.
        # Por ahora asumimos que hay stock y solo tomamos el precio
        subtotal = float(product.base_price) * item.quantity
        total_amount += subtotal

        order_items.append(
            web_order_model.WebOrderItem(
                product_id=product.product_id,
                quantity=item.quantity,
                unit_price=product.base_price,
                subtotal=subtotal
            )
        )

    # Crear Orden
    new_order = web_order_model.WebOrder(
        customer_name=req.customer_name,
        customer_email=req.customer_email,
        customer_phone=req.customer_phone,
        customer_document=req.customer_document,
        shipping_address=req.shipping_address,
        total_amount=total_amount,
        status="PENDIENTE"
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Asignar a los items el order_id
    for oi in order_items:
        oi.order_id = new_order.order_id
        db.add(oi)

    db.commit()

    return {"message": "Pedido recibido correctamente", "web_order_id": new_order.order_id, "order_id": new_order.order_id, "status": new_order.status}


# ═══════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS — Requieren JWT (Panel de Gestión)
# ═══════════════════════════════════════════════════════════════

@router.get("/orders")
def list_web_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Lista todos los pedidos online. Solo accesible por personal autorizado."""
    query = db.query(web_order_model.WebOrder).options(
        joinedload(web_order_model.WebOrder.items).joinedload(web_order_model.WebOrderItem.product)
    )

    if status and status.upper() in VALID_STATUSES:
        query = query.filter(web_order_model.WebOrder.status == status.upper())
    if search:
        query = query.filter(
            or_(
                web_order_model.WebOrder.customer_name.ilike(f"%{search}%"),
                web_order_model.WebOrder.customer_email.ilike(f"%{search}%"),
                web_order_model.WebOrder.customer_phone.ilike(f"%{search}%"),
            )
        )

    orders = query.order_by(desc(web_order_model.WebOrder.created_at)).offset(skip).limit(limit).all()

    result = []
    for o in orders:
        result.append({
            "order_id": o.order_id,
            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
            "customer_phone": o.customer_phone,
            "customer_document": o.customer_document,
            "shipping_address": o.shipping_address,
            "total_amount": float(o.total_amount),
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "item_count": len(o.items),
            "items": [
                {
                    "item_id": i.item_id,
                    "product_id": i.product_id,
                    "product_name": i.product.name if i.product else f"Producto #{i.product_id}",
                    "product_sku": i.product.sku if i.product else "N/A",
                    "quantity": i.quantity,
                    "unit_price": float(i.unit_price),
                    "subtotal": float(i.subtotal),
                }
                for i in o.items
            ]
        })

    return result


@router.get("/orders/{order_id}")
def get_web_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Detalle completo de un pedido online."""
    order = db.query(web_order_model.WebOrder).options(
        joinedload(web_order_model.WebOrder.items).joinedload(web_order_model.WebOrderItem.product)
    ).filter(web_order_model.WebOrder.order_id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    return {
        "order_id": order.order_id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_document": order.customer_document,
        "shipping_address": order.shipping_address,
        "total_amount": float(order.total_amount),
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": [
            {
                "item_id": i.item_id,
                "product_id": i.product_id,
                "product_name": i.product.name if i.product else f"Producto #{i.product_id}",
                "product_sku": i.product.sku if i.product else "N/A",
                "quantity": i.quantity,
                "unit_price": float(i.unit_price),
                "subtotal": float(i.subtotal),
            }
            for i in order.items
        ]
    }


@router.patch("/orders/{order_id}/status")
def update_web_order_status(
    order_id: int,
    req: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Actualiza el estado de un pedido web.
    
    Cuando se marca como PAGADO se ejecutan automáticamente:
      1. Descuento de stock en inventario + registro en Kardex (SALIDA)
      2. Registro del comprador como Cliente (si no existe)
      3. Creación de una Venta en el Historial de Ventas (método WEB)
    """
    from app.models import sale_model, inventory_movement_model, client_model
    from datetime import datetime

    order = db.query(web_order_model.WebOrder).options(
        joinedload(web_order_model.WebOrder.items).joinedload(web_order_model.WebOrderItem.product)
    ).filter(web_order_model.WebOrder.order_id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    new_status = req.status.upper()
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Opciones: {VALID_STATUSES}")

    previous_status = order.status

    # ─── Comprobar si ya habíamos procesado la integración de este pedido ────
    already_integrated = db.query(sale_model.Sale).filter(
        sale_model.Sale.invoice_number == f"WEB-{order.order_id:06d}"
    ).first() is not None

    side_effects = {}

    if new_status == "PAGADO" and previous_status != "PAGADO" and not already_integrated:

        # Obtener la tienda del usuario actual (para asignar inventario)
        store_id = getattr(current_user, 'store_id', None) or 1

        # ══════════════════════════════════════════════════════════
        # INTEGRACIÓN 1: Descuento de Stock + Kardex (SALIDA)
        # ══════════════════════════════════════════════════════════
        stock_errors = []
        for item in order.items:
            if not item.product:
                continue

            # Buscar inventario en la tienda actual
            inv = db.query(product_model.Inventory).filter(
                product_model.Inventory.product_id == item.product_id,
                product_model.Inventory.store_id == store_id
            ).first()

            if not inv:
                # Intentar con cualquier tienda que tenga stock
                inv = db.query(product_model.Inventory).filter(
                    product_model.Inventory.product_id == item.product_id,
                    product_model.Inventory.quantity >= item.quantity
                ).first()

            if inv and inv.quantity >= item.quantity:
                inv.quantity -= item.quantity

                # Registrar movimiento en Kardex
                movement = inventory_movement_model.InventoryMovement(
                    product_id=item.product_id,
                    user_id=current_user.user_id,
                    store_id=inv.store_id,
                    type="SALIDA",
                    reason=f"Venta Web WEB-{order.order_id} | {order.customer_name}",
                    quantity=item.quantity,
                    unit_cost=float(item.unit_price),
                    date=datetime.utcnow()
                )
                db.add(movement)
            else:
                stock_errors.append(
                    f"Stock insuficiente para: {item.product.name} "
                    f"(disponible: {inv.quantity if inv else 0}, pedido: {item.quantity})"
                )

        side_effects["stock_discounted"] = len(stock_errors) == 0
        side_effects["stock_errors"] = stock_errors

        # ══════════════════════════════════════════════════════════
        # INTEGRACIÓN 2: Registro automático de Cliente
        # ══════════════════════════════════════════════════════════
        client = None
        if order.customer_email:
            # Buscar por email
            client = db.query(client_model.Client).filter(
                client_model.Client.email == order.customer_email
            ).first()

        if not client:
            # Crear nuevo cliente
            name_parts = order.customer_name.strip().split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            doc_type = "DNI"
            if order.customer_document and len(order.customer_document) == 11:
                doc_type = "RUC"
            elif order.customer_document and len(order.customer_document) >= 6 and not order.customer_document.isdigit():
                doc_type = "CE"
                
            client = client_model.Client(
                document_type=doc_type,
                document_number=order.customer_document or f"WEB-{order.order_id}",
                first_name=first_name,
                last_name=last_name,
                email=order.customer_email,
                phone=order.customer_phone,
                address=order.shipping_address,
                is_active=True,
                accepts_marketing=False,
                current_points=0,
                created_at=datetime.utcnow()
            )
            db.add(client)
            db.flush()  # Obtener client_id sin commitear aún
            side_effects["client_created"] = True
            side_effects["client_id"] = client.client_id
        else:
            # Actualizar datos de contacto si tienen valores vacíos
            if not client.phone and order.customer_phone:
                client.phone = order.customer_phone
            if not client.address and order.shipping_address:
                client.address = order.shipping_address
            if (not client.document_number or client.document_number.startswith("WEB-")) and order.customer_document:
                client.document_number = order.customer_document
            side_effects["client_created"] = False
            side_effects["client_id"] = client.client_id

        # Vincular cliente al pedido web
        order.client_id = client.client_id

        # ══════════════════════════════════════════════════════════
        # INTEGRACIÓN 3: Crear Venta en Historial de Ventas
        # ══════════════════════════════════════════════════════════
        new_sale = sale_model.Sale(
            store_id=store_id,
            user_id=current_user.user_id,
            client_id=client.client_id,
            total_amount=order.total_amount,
            discount_amount=0,
            net_amount=order.total_amount,
            invoice_type="BOLETA",
            invoice_series="WEB",
            invoice_number=f"WEB-{order.order_id:06d}",
            sunat_status="PENDIENTE",
            points_earned=0,
            points_used=0,
            date_created=datetime.utcnow()
        )
        db.add(new_sale)
        db.flush()  # Obtener sale_id sin commitear

        # Agregar detalles de la venta (los items del pedido)
        for item in order.items:
            detail = sale_model.SaleDetail(
                sale_id=new_sale.sale_id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal
            )
            db.add(detail)

        # Registrar pago como "WEB / Transferencia"
        payment = sale_model.SalePayment(
            sale_id=new_sale.sale_id,
            method="WEB",
            amount=order.total_amount,
            reference_code=f"WEB-ORDER-{order.order_id}"
        )
        db.add(payment)

        side_effects["sale_id"] = new_sale.sale_id
        side_effects["sale_invoice"] = f"WEB-{order.order_id:06d}"

    # ─── Actualizar estado y guardar todo en una sola transacción ────────────
    order.status = new_status
    db.commit()
    db.refresh(order)

    response = {
        "message": f"Estado actualizado a '{new_status}'",
        "order_id": order.order_id,
        "status": order.status,
    }
    if side_effects:
        response["integraciones"] = side_effects

    return response
