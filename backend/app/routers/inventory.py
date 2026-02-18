from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import func
from datetime import datetime

from app.core.database import get_db
from app.models.category_model import Category
from app.models.product_model import Product, ProductSeries, Inventory
from app.models.inventory_movement_model import InventoryMovement
from app.models.user_model import User 
from app.dependencies import get_current_user # 👈 IMPORTAR ESTO 

# IMPORTS NUEVOS PARA COMPRAS 📦
from app.models.purchase_model import Purchase, PurchaseDetail
from app.models.supplier_model import Supplier

from app.schemas.product_schema import (
    CategoryCreate, CategoryResponse, ProductCreate, ProductResponse,
    StockEntry, KardexResponse, ProductSeriesResponse
)

router = APIRouter()

# ==========================================
# 📦 RUTAS DE CATEGORÍAS
# ==========================================

@router.post("/categories/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    exists = db.query(Category).filter(Category.name == category.name).first()
    if exists:
        raise HTTPException(status_code=400, detail="La categoría ya existe")

    new_category = Category(name=category.name)
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

@router.get("/categories/", response_model=List[CategoryResponse])
def read_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

# ==========================================
# 🍎 RUTAS DE PRODUCTOS
# ==========================================

@router.post("/products/", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
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

@router.get("/products/", response_model=List[ProductResponse])
def read_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retorna el catálogo de productos con el stock DISPONIBLE EN LA TIENDA del usuario actual.
    """
    products = db.query(Product).all()
    
    # Pre-cargamos para optimizar (aunque aquí lo haremos iterativo por simplicidad)
    # Lo ideal sería un query con group_by store_id, pero mantenemos la lógica actual ajustada.
    
    for product in products:
        if product.is_serializable:
            # Contar series disponibles SOLO en la tienda del usuario
            count = db.query(ProductSeries).filter(
                ProductSeries.product_id == product.product_id,
                ProductSeries.status == 'disponible',
                ProductSeries.store_id == current_user.store_id # 📍 FILTRO TIENDA
            ).count()
            product.stock = count
        else:
            # Sumar cantidad SOLO en la tienda del usuario
            total_quantity = db.query(func.sum(Inventory.quantity)).filter(
                Inventory.product_id == product.product_id,
                Inventory.store_id == current_user.store_id # 📍 FILTRO TIENDA
            ).scalar()
            product.stock = total_quantity if total_quantity else 0

    return products

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

    # 4. REGISTRAR EN EL KARDEX (HISTORIAL GENERAL)
    kardex_entry = InventoryMovement(
        product_id=entry.product_id,
        user_id=responsible_id,
        type="ENTRADA",         
        reason=f"Compra {entry.document_type} {entry.document_number}", # Razón más específica
        quantity=entry.quantity,
        unit_cost=entry.unit_cost,
        date=datetime.now()
    )
    db.add(kardex_entry)

    # 5. ACTUALIZAR STOCK ACTUAL (DISPONIBILIDAD)
    
    # CASO A: El producto tiene SERIES (ej. Celulares)
    if entry.serials:
        added_count = 0
        try:
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
                added_count += 1
            
            db.commit()
            return {"mensaje": f"Compra registrada: {added_count} series agregadas."}
        
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

@router.get("/kardex", response_model=List[KardexResponse])
def get_kardex(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Reporte de movimientos de inventario (Kardex).
    Filtrado por la TIENDA del usuario actual.
    """
    movements = db.query(InventoryMovement).join(User).filter(
        User.store_id == current_user.store_id
    ).order_by(InventoryMovement.date.desc()).all()
    
    result = []
    for m in movements:
        result.append({
            "movement_id": m.movement_id,
            "date": m.date,
            "product_name": m.product.name if m.product else "Producto Eliminado",
            "sku": m.product.sku if m.product else "N/A",
            "type": m.type,
            "quantity": m.quantity,
            "unit_cost": m.unit_cost,
            "reason": m.reason,
            "user_name": m.user.username if m.user else "Desconocido"
        })
    
    return result

# ==========================================
# 📱 ENDPOINT PARA LISTAR IMEIS DISPONIBLES
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
    
    print(f"🔍 DEBUG: Encontradas {len(series_list)} series para product_id={product_id}, store_id={store_id}")
    
    # Serializar explícitamente cada objeto
    result = []
    for s in series_list:
        result.append({
            "series_id": s.series_id,
            "serial_number": s.serial_number,
            "status": s.status,
            "product_id": s.product_id
        })
    
    print(f"🔍 DEBUG: Primer resultado: {result[0] if result else 'VACIO'}")
    
    return result
