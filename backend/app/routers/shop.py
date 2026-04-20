from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.dependencies import get_current_user

# Importaciones directas de modelos para evitar conflictos de mapeo
from app.models.product_model import Product, Inventory
from app.models.web_order_model import WebOrder, WebOrderItem
from app.models.client_model import Client
from app.models.sale_model import Sale, SaleDetail, SalePayment
from app.models.inventory_movement_model import InventoryMovement
from app.models.category_model import Category

router = APIRouter()

# Estados válidos de un pedido web
VALID_STATUSES = ["PENDIENTE", "PAGADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO", "CANCELADO"]

# DTOs
class CartItem(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[float] = None

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
    categories = db.query(Category).all()
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
        if c_data["parent_id"] and c_data["parent_id"] in cat_dict:
            cat_dict[c_data["parent_id"]]["subcategories"].append(c_data)
        elif not c_data["parent_id"]:
            tree.append(c_data)
    return tree


# ─── Helper: Stock real según tipo de producto ───────────────────────────────
def _get_real_stock(db: Session, product_id: int, is_serializable: bool) -> int:
    """Calcula el stock real disponible según el tipo de producto.
    - Serializables: cuenta product_series con status='disponible'
    - Normales: suma inventory.quantity de todas las tiendas
    """
    if is_serializable:
        from app.models.product_model import ProductSeries
        return db.query(func.count(ProductSeries.series_id)).filter(
            ProductSeries.product_id == product_id,
            ProductSeries.status == "disponible"
        ).scalar() or 0
    else:
        return int(db.query(func.coalesce(func.sum(Inventory.quantity), 0)).filter(
            Inventory.product_id == product_id
        ).scalar())


@router.get("/products")
def get_public_products(search: Optional[str] = None, category_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Product)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if category_id:
        all_categories = db.query(Category).all()
        target_ids = {category_id}
        changed = True
        while changed:
            changed = False
            for cat in all_categories:
                if cat.parent_id in target_ids and cat.category_id not in target_ids:
                    target_ids.add(cat.category_id)
                    changed = True
        query = query.filter(Product.category_id.in_(target_ids))
    products = query.limit(limit).all()
    result = []
    for p in products:
        real_stock = _get_real_stock(db, p.product_id, p.is_serializable)
        result.append({
            "product_id": p.product_id, "sku": p.sku, "name": p.name, "description": p.description,
            "base_price": float(p.base_price), "image_url": p.image_url, "is_serializable": p.is_serializable,
            "category_id": p.category_id, "stock": real_stock,
        })
    return result

@router.get("/products/{product_id}")
def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    real_stock = _get_real_stock(db, product.product_id, product.is_serializable)
    return {
        "product_id": product.product_id, "sku": product.sku, "name": product.name, "description": product.description,
        "base_price": float(product.base_price), "image_url": product.image_url, "is_serializable": product.is_serializable,
        "category_id": product.category_id, "stock": real_stock,
    }


@router.post("/checkout")
def process_web_checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    if not req.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")
    
    total_amount = 0
    order_items_objs = []
    stock_issues = []

    for item in req.items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
        
        # ✅ Validar stock REAL antes de aceptar la orden
        real_stock = _get_real_stock(db, product.product_id, product.is_serializable)
        if real_stock < item.quantity:
            stock_issues.append(
                f"\"{product.name}\": solicitado {item.quantity}, disponible {real_stock}"
            )
        
        subtotal = float(product.base_price) * item.quantity
        total_amount += subtotal
        order_items_objs.append(WebOrderItem(
            product_id=product.product_id,
            quantity=item.quantity,
            unit_price=product.base_price,
            subtotal=subtotal
        ))
    
    # Bloquear si hay insuficiencia de stock en algún producto
    if stock_issues:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Stock insuficiente para completar el pedido.",
                "items": stock_issues
            }
        )
    
    try:
        new_order = WebOrder(
            customer_name=req.customer_name, customer_email=req.customer_email, customer_phone=req.customer_phone,
            customer_document=req.customer_document, shipping_address=req.shipping_address, total_amount=total_amount, status="PENDIENTE"
        )
        db.add(new_order)
        db.flush()
        for oi in order_items_objs:
            oi.order_id = new_order.order_id
            db.add(oi)
        db.commit()
        return {"web_order_id": new_order.order_id, "status": new_order.status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders")
def list_web_orders(status: Optional[str] = None, search: Optional[str] = None, limit: int = 50, skip: int = 0, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(WebOrder).options(joinedload(WebOrder.items).joinedload(WebOrderItem.product))
    if status: query = query.filter(WebOrder.status == status.upper())
    if search: query = query.filter(or_(WebOrder.customer_name.ilike(f"%{search}%"), WebOrder.customer_email.ilike(f"%{search}%")))
    orders_rows = query.order_by(desc(WebOrder.created_at)).offset(skip).limit(limit).all()
    
    # Mapear a una lista de diccionarios para aplanar SKU y Nombre en los items
    results = []
    for o in orders_rows:
        o_dict = {
            "order_id": o.order_id,
            "status": o.status,
            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
            "customer_phone": o.customer_phone,
            "customer_document": o.customer_document,
            "shipping_address": o.shipping_address,
            "total_amount": float(o.total_amount),
            "created_at": o.created_at,
            "item_count": len(o.items),
            "items": [
                {
                    "item_id": i.item_id,
                    "product_id": i.product_id,
                    "product_sku": i.product.sku if i.product else "N/A",
                    "product_name": i.product.name if i.product else "Producto Desconocido",
                    "quantity": i.quantity,
                    "unit_price": float(i.unit_price),
                    "subtotal": float(i.subtotal)
                } for i in o.items
            ]
        }
        results.append(o_dict)
    return results

@router.get("/orders/{order_id}")
def get_web_order_detail(order_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    o = db.query(WebOrder).options(joinedload(WebOrder.items).joinedload(WebOrderItem.product)).filter(WebOrder.order_id == order_id).first()
    if not o: raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    return {
        "order_id": o.order_id,
        "status": o.status,
        "customer_name": o.customer_name,
        "customer_email": o.customer_email,
        "customer_phone": o.customer_phone,
        "customer_document": o.customer_document,
        "shipping_address": o.shipping_address,
        "total_amount": float(o.total_amount),
        "created_at": o.created_at,
        "items": [
            {
                "item_id": i.item_id,
                "product_id": i.product_id,
                "product_sku": i.product.sku if i.product else "N/A",
                "product_name": i.product.name if i.product else "Producto Desconocido",
                "quantity": i.quantity,
                "unit_price": float(i.unit_price),
                "subtotal": float(i.subtotal)
            } for i in o.items
        ]
    }

@router.patch("/orders/{order_id}/status")
def update_web_order_status(order_id: int, req: OrderStatusUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    order = db.query(WebOrder).options(joinedload(WebOrder.items).joinedload(WebOrderItem.product)).filter(WebOrder.order_id == order_id).first()
    if not order: raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    new_status = req.status.upper()
    previous_status = order.status
    side_effects = {}
    
    already_integrated = db.query(Sale).filter(Sale.invoice_number == f"WEB-{order.order_id:06d}").first() is not None

    if new_status == "PAGADO" and previous_status != "PAGADO" and not already_integrated:
        try:
            # 1. Definir Tienda (Prioridad: Tienda del Admin actual, fallback: Sede Principal)
            processing_store_id = getattr(current_user, 'store_id', None) or 1
            stock_errors = []

            # 2. Descuento de Stock + Kardex
            for item in order.items:
                product_obj = item.product
                is_serializable = product_obj.is_serializable if product_obj else False

                # --- Buscar el registro de inventario con stock disponible ---
                inv = db.query(Inventory).filter(
                    Inventory.product_id == item.product_id,
                    Inventory.store_id == processing_store_id,
                    Inventory.quantity >= item.quantity
                ).first()

                if not inv:
                    # Si no hay suficiente en la tienda del admin, buscamos la que tenga MÁS
                    inv = db.query(Inventory).filter(
                        Inventory.product_id == item.product_id,
                        Inventory.quantity >= item.quantity
                    ).order_by(desc(Inventory.quantity)).first()

                if inv:
                    deduction_store_id = inv.store_id

                    if is_serializable:
                        # Para productos con IMEI/Serie: marcar product_series como 'vendido'
                        # Tomamos las primeras N series 'disponibles' de esa tienda
                        from app.models.product_model import ProductSeries
                        available_series = db.query(ProductSeries).filter(
                            ProductSeries.product_id == item.product_id,
                            ProductSeries.store_id == deduction_store_id,
                            ProductSeries.status == "disponible"
                        ).limit(item.quantity).all()

                        series_sold = len(available_series)
                        for serie in available_series:
                            serie.status = "vendido"
                            db.add(serie)

                        # Actualizar inventory.quantity de forma explícita
                        inv.quantity = max(0, int(inv.quantity) - series_sold)
                        db.add(inv)

                        if series_sold < item.quantity:
                            stock_errors.append(f"{product_obj.name} (solo {series_sold}/{item.quantity} series disponibles)")
                    else:
                        # Para productos normales: descontamos directamente de inventory.quantity
                        inv.quantity = int(inv.quantity) - int(item.quantity)
                        db.add(inv)

                    db.add(InventoryMovement(
                        product_id=item.product_id,
                        user_id=current_user.user_id,
                        store_id=deduction_store_id,
                        type="SALIDA",
                        reason=f"WEB-{order.order_id}",
                        quantity=item.quantity,
                        unit_cost=float(item.unit_price)
                    ))
                else:
                    stock_errors.append(product_obj.name if product_obj else f"ID {item.product_id}")
            
            side_effects["stock_discounted"] = len(stock_errors) == 0
            side_effects["stock_errors"] = stock_errors

            # 3. Cliente
            client = None
            if order.customer_email:
                client = db.query(Client).filter(Client.email == order.customer_email).first()
            
            if not client:
                name_parts = (order.customer_name or "").strip().split(" ", 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""
                client = Client(
                    document_number=order.customer_document or f"WEB-{order.order_id}",
                    first_name=first_name,
                    last_name=last_name,
                    email=order.customer_email,
                    phone=order.customer_phone,
                    address=order.shipping_address
                )
                db.add(client)
                db.flush()
            
            # 4. Crear Venta en Historial
            new_sale = Sale(
                store_id=processing_store_id,
                user_id=current_user.user_id,
                client_id=client.client_id,
                total_amount=order.total_amount,
                net_amount=order.total_amount,
                invoice_type="BOLETA",
                invoice_series="WEB",
                invoice_number=f"{order.order_id:06d}",
                sunat_status="PENDIENTE"
            )
            db.add(new_sale)
            db.flush()

            for item in order.items:
                db.add(SaleDetail(
                    sale_id=new_sale.sale_id,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    subtotal=item.subtotal
                ))

            db.add(SalePayment(
                sale_id=new_sale.sale_id,
                method="WEB",
                amount=order.total_amount,
                reference_code=f"WEB-{order.order_id}"
            ))

            db.flush()
            side_effects["sale_id"] = new_sale.sale_id
            side_effects["sale_invoice"] = f"WEB-{order.order_id:06d}"
            side_effects["client_id"] = client.client_id

        except Exception as e:
            db.rollback()
            import traceback
            import logging as _logging
            _logger = _logging.getLogger(__name__)
            _logger.error(f"ERROR INTEGRACION WEB: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Error en integración: {str(e)}")

    order.status = new_status
    db.commit()
    return {
        "message": "Estado actualizado correctamente",
        "order_id": order.order_id,
        "status": order.status,
        "integraciones": side_effects if side_effects else None
    }
