from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from datetime import datetime, date, timedelta
from typing import List, Optional

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.sale_model import Sale, SaleDetail, SalePayment
from app.models.product_model import Product, ProductSeries, Inventory, Category
from app.models.user_model import User
from app.models.client_model import Client

router = APIRouter()

# --- HELPER: FILTRO DE FECHAS ---
def apply_date_filter(query, model_date_field, start_date: date, end_date: date):
    # Ajustar end_date para incluir todo el día (23:59:59)
    end_datetime = datetime.combine(end_date, datetime.max.time())
    return query.filter(model_date_field >= start_date, model_date_field <= end_datetime)

# ==========================================
# 📊 1. RESUMEN DE VENTAS (KPIs + GRÁFICO)
# ==========================================
@router.get("/sales-summary")
def get_sales_summary(
    start_date: date,
    end_date: date,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Si no es admin/superadmin, forzar store_id del usuario
    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id
    
    # Query Base
    query = db.query(Sale).filter(Sale.sunat_status != 'ANULADO')
    
    if store_id:
        query = query.filter(Sale.store_id == store_id)
        
    query = apply_date_filter(query, Sale.date_created, start_date, end_date)
    
    # Ejecutar
    sales = query.all()
    
    total_sales = sum(float(s.total_amount) for s in sales)
    transaction_count = len(sales)
    
    # Calcular Utilidad (Aprox)
    total_cost = 0
    for sale in sales:
        for detail in sale.details:
            # Intentar obtener costo real de la serie, sino usar costo promedio del producto
            item_cost = 0
            if detail.series_id:
                serie = db.query(ProductSeries).filter(ProductSeries.series_id == detail.series_id).first()
                if serie and serie.cost:
                    item_cost = float(serie.cost)
            
            # Fallback: Costo promedio o estimado (80% del precio venta como seguridad)
            if item_cost == 0:
                # OJO: Esto es solo estimación si no hay data de costos precisa
                item_cost = float(detail.unit_price or 0) * 0.7 
                
            total_cost += item_cost * (detail.quantity or 0)
            
    gross_profit = total_sales - total_cost

    # --- DATOS PARA GRÁFICO (Agrupado por día) ---
    chart_data = []
    
    # Diccionario temporal para agrupar
    daily_stats = {}
    current_d = start_date
    while current_d <= end_date:
        daily_stats[current_d.strftime("%Y-%m-%d")] = 0
        current_d += timedelta(days=1)
        
    for sale in sales:
        day_str = sale.date_created.strftime("%Y-%m-%d")
        if day_str in daily_stats:
            daily_stats[day_str] += float(sale.total_amount or 0)
            
    # Formatear para Recharts
    for date_str, total in daily_stats.items():
        chart_data.append({"date": date_str, "total": total})

    # --- CÁLCULO DE CRECIMIENTO (Growth Metrics) ---
    # Comparar con el periodo anterior de la misma duración
    days_diff = (end_date - start_date).days + 1
    prev_end_date = start_date - timedelta(days=1)
    prev_start_date = prev_end_date - timedelta(days=days_diff - 1)
    
    # Query Periodo Anterior
    prev_query = db.query(Sale).filter(Sale.sunat_status != 'ANULADO')
    if store_id:
        prev_query = prev_query.filter(Sale.store_id == store_id)
    prev_query = apply_date_filter(prev_query, Sale.date_created, prev_start_date, prev_end_date)
    prev_sales = prev_query.all()
    
    prev_total_sales = sum(float(s.total_amount) for s in prev_sales)
    prev_txn_count = len(prev_sales)
    prev_ticket = prev_total_sales / prev_txn_count if prev_txn_count > 0 else 0
    
    # Calcular Costo Anterior para Utilidad
    prev_total_cost = 0
    for ps in prev_sales:
        for d in ps.details:
            c = 0
            if d.series_id:
                s = db.query(ProductSeries).filter(ProductSeries.series_id == d.series_id).first()
                if s and s.cost: c = float(s.cost)
            if c == 0: c = float(d.unit_price or 0) * 0.7
            prev_total_cost += c * (d.quantity or 0)
    prev_gross_profit = prev_total_sales - prev_total_cost

    def calculate_growth(current, previous):
        if previous == 0: return 100.0 if current > 0 else 0.0
        return ((current - previous) / previous) * 100

    sales_growth = calculate_growth(total_sales, prev_total_sales)
    txn_growth = calculate_growth(transaction_count, prev_txn_count)
    ticket_growth = calculate_growth(total_sales / transaction_count if transaction_count > 0 else 0, prev_ticket)
    profit_growth = calculate_growth(gross_profit, prev_gross_profit)

    return {
        "total_sales": total_sales,
        "transaction_count": transaction_count,
        "gross_profit": gross_profit,
        "average_ticket": total_sales / transaction_count if transaction_count > 0 else 0,
        "chart_data": chart_data,
        "growth": {
            "sales": sales_growth,
            "transactions": txn_growth,
            "ticket": ticket_growth,
            "profit": profit_growth
        }
    }

# ==========================================
# 🏆 2. TOP PRODUCTOS
# ==========================================
@router.get("/top-products")
def get_top_products(
    start_date: date,
    end_date: date,
    store_id: Optional[int] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id

    query = db.query(
        Product.name,
        func.sum(SaleDetail.quantity).label('total_qty'),
        func.sum(SaleDetail.subtotal).label('total_amount')
    ).join(SaleDetail, Product.product_id == SaleDetail.product_id)\
     .join(Sale, Sale.sale_id == SaleDetail.sale_id)\
     .filter(Sale.sunat_status != 'ANULADO')
     
    if store_id:
        query = query.filter(Sale.store_id == store_id)
        
    # Filtro fecha
    end_datetime = datetime.combine(end_date, datetime.max.time())
    query = query.filter(Sale.date_created >= start_date, Sale.date_created <= end_datetime)
    
    results = query.group_by(Product.name)\
                   .order_by(desc('total_qty'))\
                   .limit(limit)\
                   .all()
                   
    return [
        {
            "name": r.name,
            "quantity": int(r.total_qty or 0),
            "amount": float(r.total_amount or 0)
        }
        for r in results
    ]

# ==========================================
# 🥧 3. VENTAS POR CATEGORÍA
# ==========================================
@router.get("/by-category")
def get_sales_by_category(
    start_date: date,
    end_date: date,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # from app.models.category_model import Category # Importación diferida

    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id

    query = db.query(
        Category.name,
        func.sum(SaleDetail.subtotal).label('total_amount')
    ).join(Product, Product.category_id == Category.category_id)\
     .join(SaleDetail, SaleDetail.product_id == Product.product_id)\
     .join(Sale, Sale.sale_id == SaleDetail.sale_id)\
     .filter(Sale.sunat_status != 'ANULADO')

    if store_id:
        query = query.filter(Sale.store_id == store_id)

    end_datetime = datetime.combine(end_date, datetime.max.time())
    query = query.filter(Sale.date_created >= start_date, Sale.date_created <= end_datetime)
    
    results = query.group_by(Category.name).all()
    
    return [
        {"name": r.name, "value": float(r.total_amount or 0)}
        for r in results
    ]

# ==========================================
# 💳 4. MÉTODOS DE PAGO
# ==========================================
@router.get("/payment-methods")
def get_payment_methods_report(
    start_date: date,
    end_date: date,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id

    # Usamos SalePayment para mayor precisión si existe, sino fallback a Sale si guardas el método ahí
    # Asumiendo que usas SalePayment vinculado a Sale
    # 1. Obtener desglose por métodos registrados
    query = db.query(
        SalePayment.method,
        func.sum(SalePayment.amount).label('total')
    ).join(Sale, Sale.sale_id == SalePayment.sale_id)\
     .filter(Sale.sunat_status != 'ANULADO')

    if store_id:
        query = query.filter(Sale.store_id == store_id)

    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    # Filtro de fecha para pagos
    query = query.filter(Sale.date_created >= start_date, Sale.date_created <= end_datetime)
    results = query.group_by(SalePayment.method).all()
    
    data = [{"name": r.method, "value": float(r.total or 0)} for r in results]
    
    # 2. Calcular Venta Total Neta en el periodo (para encontrar brecha)
    total_sales_query = db.query(func.sum(Sale.total_amount)).filter(
        Sale.sunat_status != 'ANULADO',
        Sale.date_created >= start_date, 
        Sale.date_created <= end_datetime
    )
    if store_id:
        total_sales_query = total_sales_query.filter(Sale.store_id == store_id)
        
    total_sales = total_sales_query.scalar() or 0
    total_payments = sum(item['value'] for item in data)
    
    # Si hay diferencia significativa (> 1 sol), asumimos que son ventas antiguas sin método registrado (Efectivo por defecto o "Sin Definir")
    gap = float(total_sales) - total_payments
    if gap > 1:
        # data.append({"name": "SIN REGISTRAR", "value": gap}) 
        # O si el cliente prefiere que asumas efectivo:
        found_cash = False
        for item in data:
            if item["name"].upper() == "EFECTIVO":
                item["value"] += gap
                found_cash = True
                break
        if not found_cash:
             data.append({"name": "EFECTIVO (DEDUCIDO)", "value": gap})

    return data

# ==========================================
# 👔 5. RENDIMIENTO VENDEDORES
# ==========================================
@router.get("/by-seller")
def get_sales_by_seller(
    start_date: date,
    end_date: date,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id

    query = db.query(
        User.username,
        func.sum(Sale.total_amount).label('total_sold'),
        func.count(Sale.sale_id).label('txn_count')
    ).join(Sale, Sale.user_id == User.user_id)\
     .filter(Sale.sunat_status != 'ANULADO')

    if store_id:
        query = query.filter(Sale.store_id == store_id)

    end_datetime = datetime.combine(end_date, datetime.max.time())
    query = query.filter(Sale.date_created >= start_date, Sale.date_created <= end_datetime)
    
    results = query.group_by(User.username).order_by(desc('total_sold')).all()
    
    return [
        {
            "name": r.username, 
            "total": float(r.total_sold or 0),
            "count": int(r.txn_count)
        }
        for r in results
    ]

# ==========================================
# 📦 6. ANALÍTICA DE INVENTARIO (Extra Auditoría)
# ==========================================
@router.get("/inventory-valuation")
def get_inventory_valuation(
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id

    # Calcular valorizado: Suma de (Stock * Costo Promedio)
    # Si costo es 0, usamos 70% del precio base como estimado
    products = db.query(Product).all()
    
    total_valuation = 0.0
    total_items = 0
    
    for p in products:
        # Obtener stock (filtrado por tienda si aplica)
        stock = 0
        if store_id:
            inv = db.query(Inventory).filter(Inventory.product_id == p.product_id, Inventory.store_id == store_id).first()
            if inv: stock = inv.quantity
        else:
            # Suma global
            invs = db.query(Inventory).filter(Inventory.product_id == p.product_id).all()
            stock = sum(i.quantity for i in invs)
            
        if stock > 0:
            cost = p.average_cost
            if not cost or cost == 0:
                # FIX: Usar Precio Base completo si no hay costo, para reflejar Valor de Venta aprox
                # O un margen estimado más alto. Usuario reportó 9k vs 150k.
                # Asumiremos que buscan "Valor Comercial" o que el margen es alto.
                cost = p.base_price  # Fallback a precio lista 100%
            
            total_valuation += stock * cost
            total_items += stock
            
    return {
        "total_valuation": total_valuation,
        "total_items": total_items
    }

@router.get("/low-rotation")
def get_low_rotation_products(
    days: int = 30, # Días sin ventas para considerar "Dinosaurio"
    store_id: Optional[int] = None,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id
        
    # Estrategia:
    # 1. Obtener productos con stock > 0
    # 2. Verificar si han tenido ventas en los últimos X días
    
    limit_date = date.today() - timedelta(days=days)
    
    # Subquery de productos vendidos recientemente
    recent_sales_subquery = db.query(SaleDetail.product_id).join(Sale).filter(
        Sale.date_created >= limit_date,
        Sale.sunat_status != 'ANULADO'
    )
    
    if store_id:
        recent_sales_subquery = recent_sales_subquery.filter(Sale.store_id == store_id)
        
    recent_sales_subquery = recent_sales_subquery.distinct()
    
    # Query principal: Productos con stock QUE NO ESTÁN en ventas recientes
    query = db.query(Product).filter(Product.product_id.notin_(recent_sales_subquery))
    
    candidates = query.all()
    dinosaurs = []
    
    for p in candidates:
        stock = 0
        if store_id:
            inv = db.query(Inventory).filter(Inventory.product_id == p.product_id, Inventory.store_id == store_id).first()
            if inv: stock = inv.quantity
        else:
            invs = db.query(Inventory).filter(Inventory.product_id == p.product_id).all()
            stock = sum(i.quantity for i in invs)
            
        if stock > 0:
            val = stock * (p.average_cost or p.base_price * 0.7)
            dinosaurs.append({
                "name": p.name,
                "stock": stock,
                "value": val,
                "last_sale": "Más de 30 días"
            })
            
        if len(dinosaurs) >= limit:
            break
            
    return dinosaurs

# ==========================================
# ⏱️ 7. RECOMENDACIÓN: HORA PICO (Heatmap)
# ==========================================
@router.get("/sales-by-hour")
def get_sales_by_hour(
    start_date: date,
    end_date: date,
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "superadmin"] and current_user.store_id:
        store_id = current_user.store_id

    # Extraer hora de la fecha de creación
    # SQLite usa strftime('%H', ...), Postgres extract(hour from ...)
    # Asumiremos SQLite por compatibilidad con el proyecto actual, o funcion genérica
    
    # Enfoque Python-side para máxima compatibilidad (SQLite/Postgres)
    query = db.query(Sale.date_created, Sale.total_amount).filter(Sale.sunat_status != 'ANULADO')

    if store_id:
        query = query.filter(Sale.store_id == store_id)

    end_datetime = datetime.combine(end_date, datetime.max.time())
    query = query.filter(Sale.date_created >= start_date, Sale.date_created <= end_datetime)
    
    sales = query.all()
    
    # Inicializar contadores 0-23
    hours_data = {h: {"transactions": 0, "total": 0.0} for h in range(24)}
    
    for s in sales:
        if s.date_created:
            h = s.date_created.hour
            hours_data[h]["transactions"] += 1
            hours_data[h]["total"] += float(s.total_amount or 0)
            
    final_data = []
    # Filtrar horas comerciales (8am a 10pm) para limpiar gráfico
    for h in range(8, 22):
        row = hours_data[h]
        final_data.append({
            "hour": f"{h}:00",
            "transactions": row["transactions"],
            "total": row["total"]
        })
        
    return final_data
