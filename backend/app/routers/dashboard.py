from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.sale_model import Sale, SaleDetail
from app.models.product_model import Product, Inventory, ProductSeries
from app.models.client_model import Client
from app.models.user_model import User

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    store_id: Optional[int] = Query(None, description="Override store_id para admins multi-sucursal")
):
    today = datetime.now().date()
    # Si admin pasa store_id por query param, usarlo. Si no, usar el del token.
    effective_store_id = store_id if store_id is not None else current_user.store_id
    
    from sqlalchemy.orm import joinedload
    
    # --- 1. DATOS DE VENTA (HOY) ---
    # Filtrar por tienda
    sales_today = db.query(Sale).filter(
        func.date(Sale.date_created) == today,
        Sale.store_id == effective_store_id
    ).options(
        joinedload(Sale.details).joinedload(SaleDetail.series)
    ).all()
    
    total_money_today = sum(float(s.total_amount) for s in sales_today)
    transaction_count_today = len(sales_today)

    # --- 1.1 COMPARATIVA CON AYER (GROWTH) ---
    yesterday = today - timedelta(days=1)
    sales_yesterday = db.query(Sale).filter(
        func.date(Sale.date_created) == yesterday,
        Sale.store_id == effective_store_id
    ).all()
    
    total_money_yesterday = sum(float(s.total_amount) for s in sales_yesterday)

    growth_percentage = 0.0
    if total_money_yesterday > 0:
        growth_percentage = ((total_money_today - total_money_yesterday) / total_money_yesterday) * 100
    else:
        growth_percentage = 100.0 if total_money_today > 0 else 0.0

    # --- 2. UTILIDAD ESTIMADA (HOY) ---
    gross_profit_today = 0
    for sale in sales_today:
        for detail in sale.details:
            cost = 0.0
            if detail.series_id and detail.series:
                cost = float(detail.series.cost) if detail.series.cost else 0.0
            
            if cost == 0:
                cost = float(detail.unit_price) * 0.8 
            
            subtotal_float = float(detail.subtotal)
            profit = subtotal_float - (cost * detail.quantity)
            gross_profit_today += profit

    # --- 3. VALOR DEL INVENTARIO (ACTUAL) ---
    # PARTE A: Series Disponibles en ESTA TIENDA
    series_value = db.query(func.coalesce(func.sum(ProductSeries.cost), 0.0)).filter(
        ProductSeries.status == 'disponible',
        ProductSeries.store_id == effective_store_id
    ).scalar()
    
    # PARTE B: Inventario Simple en ESTA TIENDA
    simple_products_value = db.query(
        func.sum(Inventory.quantity * Product.average_cost)
    ).join(Product, Inventory.product_id == Product.product_id)\
     .filter(
         Product.is_serializable == False,
         Inventory.store_id == effective_store_id
     ).scalar() or 0.0

    inventory_value = float(series_value) + float(simple_products_value)

    # --- 4. GRÁFICO VENTAS 7 DÍAS ---
    chart_data = []
    start_date_chart = today - timedelta(days=6)
    
    daily_sales = db.query(
        func.date(Sale.date_created), 
        func.coalesce(func.sum(Sale.total_amount), 0.0)
    ).filter(
        func.date(Sale.date_created) >= start_date_chart,
        func.date(Sale.date_created) <= today,
        Sale.store_id == effective_store_id
    ).group_by(func.date(Sale.date_created)).all()
    
    # daily_sales items are tuples: (datetime.date(2023, 10, 15), 1500.0)
    daily_dict = {str(d[0]): float(d[1]) for d in daily_sales}

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = str(day)
        
        chart_data.append({
            "name": day.strftime("%d/%m"), 
            "total": daily_dict.get(day_str, 0.0)
        })

    # --- 5. TOP PRODUCTOS (DE ESTA TIENDA) ---
    # Unimos con SaleDetail y Sale para poder filtrar por Sale.store_id
    top_products_query = db.query(Product.name, func.sum(SaleDetail.quantity).label('qty'))\
        .join(SaleDetail, SaleDetail.product_id == Product.product_id)\
        .join(Sale, Sale.sale_id == SaleDetail.sale_id)\
        .filter(Sale.store_id == effective_store_id)\
        .group_by(Product.name).order_by(desc('qty')).limit(5).all()
    
    top_products = [{"name": t[0], "value": t[1]} for t in top_products_query]
    
    # --- 6. CLIENTES (GLOBAL o LOCAL?) ---
    # Generalmente clientes son globales, pero podemos filtrar si la venta fue aquí.
    # Por ahora dejamos global para que vean cartera completa, o filtrar 'clientes que compraron aquí'
    total_clients = db.query(Client).count()

    # --- 7. TOP VENDEDORES (DE ESTA TIENDA) ---
    top_sellers_query = db.query(
        User.username, 
        func.sum(Sale.total_amount).label('total_sold')
    ).join(Sale, Sale.user_id == User.user_id)\
     .filter(
         func.date(Sale.date_created) == today,
         Sale.store_id == effective_store_id
     )\
     .group_by(User.username)\
     .order_by(desc('total_sold'))\
     .all()
     
    top_sellers = [{"name": t[0], "value": float(t[1])} for t in top_sellers_query]

    return {
        "money_today": total_money_today,
        "profit_today": gross_profit_today,
        "transactions_today": transaction_count_today,
        "inventory_value": inventory_value,
        "chart_data": chart_data,
        "top_products": top_products,
        "total_clients": total_clients,
        "growth_percentage": growth_percentage,
        "top_sellers": top_sellers
    }