from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import func
from datetime import datetime

from app.core.database import get_db
from app.models.category_model import Category
from app.models.product_model import Product, ProductSeries, Inventory
from app.models.inventory_movement_model import InventoryMovement
from app.models.user_model import User 
from app.dependencies import get_current_user

# Imports para módulo de compras
from app.models.purchase_model import Purchase, PurchaseDetail
from app.models.supplier_model import Supplier

from app.schemas.product_schema import (
    CategoryCreate, CategoryResponse, ProductCreate, ProductUpdate, ProductResponse,
    StockEntry, KardexResponse, ProductSeriesResponse, KardexPaginatedResponse
)

router = APIRouter()

# ==========================================
# Categorías
# ==========================================

@router.post("/categories/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exists = db.query(Category).filter(Category.name == category.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="La categoría ya existe")

    new_category = Category(name=category.name, parent_id=category.parent_id)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.get("/categories/", response_model=List[CategoryResponse])
def read_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Category).all()

# ==========================================
# 🍎 RUTAS DE PRODUCTOS
# ==========================================

@router.post("/products/", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(Product).filter(Product.sku == product.sku).first():
        raise HTTPException(status_code=400, detail="El SKU ya existe")

    category = db.query(Category).filter(Category.category_id == product.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    new_product = Product(
        sku=product.sku,
        name=product.name,
        description=product.description,
        base_price=product.base_price,
        min_stock=product.min_stock,
        category_id=product.category_id,
        is_serializable=product.is_serializable,
        image_url=product.image_url
    )
    
    try:
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        return new_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear producto: {str(e)}")

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product_update: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if product_update.sku is not None and product_update.sku != product.sku:
        if db.query(Product).filter(Product.sku == product_update.sku).first():
            raise HTTPException(status_code=400, detail="El nuevo SKU ya está en uso")
        product.sku = product_update.sku

    if product_update.category_id is not None:
        category = db.query(Category).filter(Category.category_id == product_update.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        product.category_id = product_update.category_id

    update_data = product_update.model_dump(exclude_unset=True)
    # Ya procesamos sku y category_id arriba con validación
    update_data.pop('sku', None)
    update_data.pop('category_id', None)

    for key, value in update_data.items():
        setattr(product, key, value)

    try:
        db.commit()
        db.refresh(product)
        return product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar producto: {str(e)}")

@router.get("/products/", response_model=List[ProductResponse])
def read_products(store_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retorna el catálogo de productos con el stock DISPONIBLE EN LA TIENDA seleccionada.
    Admins pueden pasar store_id para ver otra tienda.
    """
    # Si es admin y envía store_id, usarlo; sino, usar el del JWT
    effective_store_id = store_id if store_id is not None else current_user.store_id
    
    products = db.query(Product).all()
    
    # 1. Obtener todos los stocks simples de esta tienda de una sola vez
    simple_stocks = dict(db.query(Inventory.product_id, func.coalesce(func.sum(Inventory.quantity), 0))
                         .filter(Inventory.store_id == effective_store_id)
                         .group_by(Inventory.product_id).all())
                         
    # 2. Obtener todos los stocks de series (IMEIs) de esta tienda de una sola vez
    series_stocks = dict(db.query(ProductSeries.product_id, func.count(ProductSeries.series_id))
                         .filter(ProductSeries.store_id == effective_store_id, ProductSeries.status == 'disponible')
                         .group_by(ProductSeries.product_id).all())

    for product in products:
        if product.is_serializable:
            product.stock = series_stocks.get(product.product_id, 0)
        else:
            product.stock = simple_stocks.get(product.product_id, 0)

    return products

@router.get("/products/low-stock", response_model=List[dict])
def read_low_stock_products(store_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retorna productos de la tienda actual cuyo stock esté por debajo del stock mínimo.
    """
    effective_store_id = store_id if store_id is not None else current_user.store_id
    
    products = db.query(Product).all()
    
    simple_stocks = dict(db.query(Inventory.product_id, func.coalesce(func.sum(Inventory.quantity), 0))
                         .filter(Inventory.store_id == effective_store_id)
                         .group_by(Inventory.product_id).all())
                         
    series_stocks = dict(db.query(ProductSeries.product_id, func.count(ProductSeries.series_id))
                         .filter(ProductSeries.store_id == effective_store_id, ProductSeries.status == 'disponible')
                         .group_by(ProductSeries.product_id).all())

    low_stock_items = []
    
    for product in products:
        stock = 0
        if product.is_serializable:
            stock = series_stocks.get(product.product_id, 0)
        else:
            stock = simple_stocks.get(product.product_id, 0)

        # Validamos alerta
        min_stock = product.min_stock if product.min_stock is not None else 5
        if stock <= min_stock:
            low_stock_items.append({
                "product_id": product.product_id,
                "sku": product.sku,
                "name": product.name,
                "stock": stock,
                "min_stock": min_stock,
                "image_url": product.image_url
            })

    return low_stock_items

# ==========================================
# 🚛 RUTA: INGRESO DE MERCADERÍA (COMPRA REAL)
# ==========================================
@router.post("/stock/entry")
def add_stock(entry: StockEntry, db: Session = Depends(get_db)):
    """
    Registra una COMPRA formal y actualiza el Stock + Kardex.
    """
    
    # 1. Validar Usuario y Proveedor
    admin_user = db.query(User).filter(User.username == "admin").first()
    responsible_id = admin_user.user_id if admin_user else 1

    supplier = db.query(Supplier).filter(Supplier.supplier_id == entry.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    # 2. CREAR LA CABECERA DE LA COMPRA (Purchase) 📄
    # Calculamos el total de esta línea (en un sistema masivo sumaríamos varios items)
    line_total = entry.quantity * entry.unit_cost

    new_purchase = Purchase(
        supplier_id=entry.supplier_id,
        user_id=responsible_id,
        document_type=entry.document_type,
        document_number=entry.document_number,
        total_amount=line_total,
        notes=entry.notes
    )
    db.add(new_purchase)
    db.flush() # Generamos el ID de la compra

    # 3. CREAR EL DETALLE DE LA COMPRA (PurchaseDetail) 📝
    new_detail = PurchaseDetail(
        purchase_id=new_purchase.purchase_id,
        product_id=entry.product_id,
        quantity=entry.quantity,
        unit_cost=entry.unit_cost,
        subtotal=line_total
    )
    db.add(new_detail)

    # 4 & 5. REGISTRAR KARDEX Y ACTUALIZAR STOCK ACTUAL (DISPONIBILIDAD)
    
    # CASO A: El producto tiene SERIES (ej. Celulares)
    if entry.serials:
        added_count = 0
        try:
            group_identifier = f"BUY_{new_purchase.purchase_id}_PROD_{entry.product_id}"
            for serial in entry.serials:
                # Verificar duplicados
                if db.query(ProductSeries).filter(ProductSeries.serial_number == serial).first():
                    continue 

                new_serie = ProductSeries(
                    product_id=entry.product_id,
                    store_id=entry.store_id,
                    serial_number=serial,
                    cost=entry.unit_cost,
                    status="disponible"
                )
                db.add(new_serie)
                db.flush() # Importante para tener new_serie.series_id
                
                # 📜 REGISTRAR EN KARDEX POR IMEI (AGRUPADo)
                kardex_entry = InventoryMovement(
                    product_id=entry.product_id,
                    user_id=responsible_id,
                    store_id=entry.store_id,
                    series_id=new_serie.series_id,
                    group_id=group_identifier,
                    type="ENTRADA",         
                    reason=f"Compra {entry.document_type} {entry.document_number}",
                    quantity=1,
                    unit_cost=entry.unit_cost,
                    date=datetime.now()
                )
                db.add(kardex_entry)
                
                added_count += 1
            
            db.commit()
            return {"mensaje": f"Compra registrada: {added_count} series agregadas al Kardex."}
        
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Error al registrar series: {str(e)}")
        
    # CASO B: El producto es GENERAL (ej. Cables)
    else:
        # 1. Buscar inventario actual
        inventory_item = db.query(Inventory).filter(
            Inventory.product_id == entry.product_id,
            Inventory.store_id == entry.store_id
        ).first()

        current_qty = inventory_item.quantity if inventory_item else 0
        
        # 2. CALCULAR COSTO PROMEDIO PONDERADO (CPP) 🧠
        product = db.query(Product).filter(Product.product_id == entry.product_id).first()
        current_avg = float(product.average_cost or 0)
        input_cost = float(entry.unit_cost)
        input_qty = entry.quantity

        if (current_qty + input_qty) > 0:
            total_value_old = current_qty * current_avg
            total_value_new = input_qty * input_cost
            new_average = (total_value_old + total_value_new) / (current_qty + input_qty)
            
            # Guardamos el nuevo promedio
            product.average_cost = new_average
        
        # 3. Actualizar Stock Físico
        if inventory_item:
            inventory_item.quantity += input_qty
        else:
            new_inv = Inventory(product_id=entry.product_id, store_id=entry.store_id, quantity=input_qty)
            db.add(new_inv)
            
        # 📜 REGISTRAR EN KARDEX GLOBAL
        kardex_entry = InventoryMovement(
            product_id=entry.product_id,
            user_id=responsible_id,
            store_id=entry.store_id,
            type="ENTRADA",         
            reason=f"Compra {entry.document_type} {entry.document_number}",
            quantity=entry.quantity,
            unit_cost=entry.unit_cost,
            date=datetime.now()
        )
        db.add(kardex_entry)
        
        db.commit()
        return {"mensaje": f"Compra registrada. Stock actualizado a {current_qty + input_qty}"}
    
# ==========================================
# 🔍 RUTA: GESTIONAR SERIES ÚNICAS
# ==========================================

# (Endpoint anterior eliminado por conflicto y lógica incorrecta)
# get_product_series se fusiona con get_available_series más abajo.

# ==========================================
# 📜 RUTA: REPORTE DE KARDEX (TRAZABILIDAD)
# ==========================================

@router.get("/kardex", response_model=KardexPaginatedResponse)
def get_kardex(
    page: int = 1,
    limit: int = 50,
    search: str = None,
    type: str = None,
    user_id: int = None,
    start_date: str = None,
    end_date: str = None,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Reporte de movimientos de inventario (Kardex).
    Filtrado por la TIENDA seleccionada (admins pueden override con store_id param).
    Soporta paginación y búsqueda del lado del servidor.
    """
    from sqlalchemy import or_, and_, cast, String
    import math
    
    effective_store_id = store_id if store_id is not None else current_user.store_id
    
    query = db.query(InventoryMovement).outerjoin(User, InventoryMovement.user_id == User.user_id).filter(
        or_(
            InventoryMovement.store_id == effective_store_id,
            User.store_id == effective_store_id
        )
    )
    
    # --- FILTROS ---
    if type and type != "TODOS":
        if type in ["ENTRADA", "IN"]:
            query = query.filter(InventoryMovement.type.in_(["ENTRADA", "IN"]))
        elif type in ["SALIDA", "OUT"]:
            query = query.filter(InventoryMovement.type.in_(["SALIDA", "OUT"]))

    if user_id:
        query = query.filter(InventoryMovement.user_id == user_id)
        
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(InventoryMovement.date >= start_dt)
        except: pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(InventoryMovement.date <= end_dt)
        except: pass
        
    if search:
        search_term = f"%{search.lower()}%"
        # Búsqueda en nombre de producto, SKU o razón
        query = query.outerjoin(Product, InventoryMovement.product_id == Product.product_id).filter(
            or_(
                func.lower(Product.name).like(search_term),
                func.lower(Product.sku).like(search_term),
                func.lower(InventoryMovement.reason).like(search_term)
            )
        )
        # Nota: Búsqueda de IMEI específico la haremos como un endpoint separado 
        # o requiriendo join a product_series si es crítico, por ahora cubrimos SKU y Nombre

    # --- ORDENAMIENTO Y PAGINACIÓN ---
    query = query.order_by(InventoryMovement.date.desc())
    
    total_records = query.count()
    total_pages = math.ceil(total_records / limit) if total_records > 0 else 1
    
    offset = (page - 1) * limit
    movements = query.offset(offset).limit(limit).all()
    
    grouped_result = []
    seen_groups = set()
    
    for m in movements:
        if m.group_id:
            # Si ya procesamos este grupo, lo ignoramos para no repetir lineas
            if m.group_id in seen_groups:
                continue
            
            seen_groups.add(m.group_id)
            
            # Buscar todos los movimientos de este grupo
            group_movs = [gm for gm in movements if gm.group_id == m.group_id]
            
            # Sumar cantidades
            total_qty = sum(gm.quantity for gm in group_movs)
            
            # Recolectar IMEIs
            serial_nums = [gm.series.serial_number for gm in group_movs if gm.series_id and gm.series]
            serial_num = f"{len(serial_nums)} series" if serial_nums else None
            
            grouped_result.append({
                "movement_id": m.movement_id, # Usamos el ID del primero como ref
                "date": m.date,
                "product_name": m.product.name if m.product else "Producto Eliminado",
                "sku": m.product.sku if m.product else "N/A",
                "type": m.type,
                "quantity": total_qty, # SUMA TOTAL DEL GRUPO
                "unit_cost": m.unit_cost,
                "reason": m.reason,
                "user_name": m.user.username if m.user else "Desconocido",
                "serial_number": serial_num,
                "serial_numbers": serial_nums,
                "group_id": m.group_id
            })
            
        else:
            # Movimiento normal sin grupo
            serial_num = m.series.serial_number if m.series_id and m.series else None
            serial_nums = [serial_num] if serial_num else []
            
            grouped_result.append({
                "movement_id": m.movement_id,
                "date": m.date,
                "product_name": m.product.name if m.product else "Producto Eliminado",
                "sku": m.product.sku if m.product else "N/A",
                "type": m.type,
                "quantity": m.quantity,
                "unit_cost": m.unit_cost,
                "reason": m.reason,
                "user_name": m.user.username if m.user else "Desconocido",
                "serial_number": serial_num,
                "serial_numbers": serial_nums,
                "group_id": None
            })
            
    return {
        "data": grouped_result,
        "total_records": total_records,
        "current_page": page,
        "total_pages": total_pages
    }


@router.get("/kardex/{movement_id}")
def get_kardex_detail(movement_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Detalle de un movimiento específico del Kardex.
    Incluye info de IMEI, proveedor, tienda, etc.
    """
    mov = db.query(InventoryMovement).filter(InventoryMovement.movement_id == movement_id).first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    
    # Info de serie/IMEI (Soporte para Agrupados o Individuales)
    serial_infos = []
    
    if mov.group_id:
        # Recuperar todos los movs de este grupo
        grouped_movs = db.query(InventoryMovement).filter(InventoryMovement.group_id == mov.group_id).all()
        for gm in grouped_movs:
            if gm.series_id and gm.series:
                serial_infos.append({
                    "series_id": gm.series.series_id,
                    "serial_number": gm.series.serial_number,
                    "status": gm.series.status,
                    "cost": float(gm.series.cost or 0)
                })
    elif mov.series_id and mov.series:
        # Movimiento individual antiguo o especial
        serial_infos.append({
            "series_id": mov.series.series_id,
            "serial_number": mov.series.serial_number,
            "status": mov.series.status,
            "cost": float(mov.series.cost or 0)
        })
    
    # Info de proveedor
    supplier_info = None
    if mov.supplier_id and mov.supplier:
        supplier_info = {
            "supplier_id": mov.supplier.supplier_id,
            "name": mov.supplier.name,
            "ruc": mov.supplier.ruc
        }
    
    # Sumar cantidades y valor total si es agrupado
    final_quantity = mov.quantity
    if mov.group_id:
        grouped_movs = db.query(InventoryMovement).filter(InventoryMovement.group_id == mov.group_id).all()
        final_quantity = sum(gm.quantity for gm in grouped_movs)

    return {
        "movement_id": mov.movement_id,
        "date": mov.date,
        "product_name": mov.product.name if mov.product else "N/A",
        "sku": mov.product.sku if mov.product else "N/A",
        "type": mov.type,
        "quantity": final_quantity,
        "unit_cost": float(mov.unit_cost or 0),
        "total_value": float((mov.unit_cost or 0) * final_quantity),
        "reason": mov.reason,
        "user_name": mov.user.username if mov.user else "Desconocido",
        "store_name": mov.store.name if mov.store else "N/A",
        "serial_infos": serial_infos,
        "supplier_info": supplier_info
    }

# ==========================================
# Endpoint para listar IMEIs disponibles
# ==========================================

@router.get("/products/{product_id}/series", response_model=List[ProductSeriesResponse])
def get_available_series(
    product_id: int,
    store_id: int,
    status: str = "disponible",
    db: Session = Depends(get_db)
):
    """
    Listar series (IMEIs) disponibles de un producto en una tienda.
    
    Query params:
    - store_id: ID de la tienda (requerido)
    - status: Estado de la serie (default: "disponible")
    """
    # Verificar que el producto exista
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Validar que el producto sea serializable
    if not product.is_serializable:
        raise HTTPException(status_code=400, detail="Este producto no requiere IMEI")
    
    # Obtener series disponibles
    series_list = db.query(ProductSeries).filter(
        ProductSeries.product_id == product_id,
        ProductSeries.store_id == store_id,
        ProductSeries.status == status
    ).all()
    

    
    # Serializar explícitamente cada objeto
    result = []
    for s in series_list:
        result.append({
            "series_id": s.series_id,
            "serial_number": s.serial_number,
            "status": s.status,
            "product_id": s.product_id
        })
    

    
    return result
