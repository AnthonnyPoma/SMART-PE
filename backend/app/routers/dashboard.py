from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from datetime import datetime, timedelta

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.sale_model import Sale, SaleDetail
from app.models.product_model import Product, Inventory, ProductSeries
from app.models.client_model import Client
from app.models.user_model import User # 👈 Importante para Top Sellers

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # 👈 Inyectamos usuario para saber su tienda
):
    today = datetime.now().date()
    store_id = current_user.store_id
    
    # --- 1. DATOS DE VENTA (HOY) ---
    # Filtrar por tienda
    sales_today = db.query(Sale).filter(
        func.date(Sale.date_created) == today,
        Sale.store_id == store_id
    ).all()
    
    total_money_today = sum(float(s.total_amount) for s in sales_today)
    transaction_count_today = len(sales_today)

    # --- 1.1 COMPARATIVA CON AYER (GROWTH) ---
    yesterday = today - timedelta(days=1)
    sales_yesterday = db.query(Sale).filter(
        func.date(Sale.date_created) == yesterday,
        Sale.store_id == store_id
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
            if detail.series_id:
                serie = db.query(ProductSeries).filter(ProductSeries.series_id == detail.series_id).first()
                if serie and serie.cost:
                    cost = float(serie.cost)
            
            if cost == 0:
                cost = float(detail.unit_price) * 0.8 
            
            subtotal_float = float(detail.subtotal)
            profit = subtotal_float - (cost * detail.quantity)
            gross_profit_today += profit

    # --- 3. VALOR DEL INVENTARIO (ACTUAL) ---
    # PARTE A: Series Disponibles en ESTA TIENDA
    series_value = db.query(func.coalesce(func.sum(ProductSeries.cost), 0.0)).filter(
        ProductSeries.status == 'disponible',
        ProductSeries.store_id == store_id # 📍 FILTRO
    ).scalar()
    
    # PARTE B: Inventario Simple en ESTA TIENDA
    simple_products_value = db.query(
        func.sum(Inventory.quantity * Product.average_cost)
    ).join(Product, Inventory.product_id == Product.product_id)\
     .filter(
         Product.is_serializable == False,
         Inventory.store_id == store_id # 📍 FILTRO
     ).scalar() or 0.0

    inventory_value = float(series_value) + float(simple_products_value)

    # --- 4. GRÁFICO VENTAS 7 DÍAS ---
    chart_data = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        
        daily_total = db.query(func.coalesce(func.sum(Sale.total_amount), 0.0)).filter(
            func.date(Sale.date_created) == day,
            Sale.store_id == store_id # 📍 FILTRO
        ).scalar()
        
        chart_data.append({
            "name": day.strftime("%d/%m"), 
            "total": float(daily_total)
        })

    # --- 5. TOP PRODUCTOS (DE ESTA TIENDA) ---
    # Unimos con SaleDetail y Sale para poder filtrar por Sale.store_id
    top_products_query = db.query(Product.name, func.sum(SaleDetail.quantity).label('qty'))\
        .join(SaleDetail, SaleDetail.product_id == Product.product_id)\
        .join(Sale, Sale.sale_id == SaleDetail.sale_id)\
        .filter(Sale.store_id == store_id)\
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
         Sale.store_id == store_id # 📍 FILTRO
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