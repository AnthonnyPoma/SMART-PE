"""
Seed script to insert test data for Sucursal Norte (store_id=2) and Almacén Central (store_id=3)
Run from backend dir: python seed_stores.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Import ALL models the same way main.py does to avoid circular deps
from app.core.database import Base, engine, SessionLocal
from app.models import (
    user_model, role_model, store_model, product_model, sale_model, 
    client_model, inventory_movement_model, supplier_model, 
    category_model, transfer_model, promotion_model, cash_model,
    loyalty_model, audit_model, rma_model
)

from datetime import datetime, timedelta
from decimal import Decimal
import random

# Access models after all imports
Sale = sale_model.Sale
SaleDetail = sale_model.SaleDetail
SalePayment = sale_model.SalePayment
Product = product_model.Product
Inventory = product_model.Inventory
User = user_model.User
Store = store_model.Store
Client = client_model.Client

db = SessionLocal()

try:
    stores = db.query(Store).all()
    store_ids = [s.store_id for s in stores]
    print(f"Tiendas: {[(s.store_id, s.name) for s in stores]}")
    
    products = db.query(Product).all()
    users = db.query(User).all()
    clients = db.query(Client).all()
    admin_user = db.query(User).filter(User.username == "admin").first() or users[0]
    
    print(f"Productos: {len(products)}, Usuarios: {len(users)}, Clientes: {len(clients)}")

    # --- INVENTARIO para stores 2 y 3 ---
    for sid in [2, 3]:
        if sid not in store_ids:
            print(f"  ⚠️ Store {sid} no existe, saltando")
            continue
        existing = db.query(Inventory).filter(Inventory.store_id == sid).count()
        if existing > 0:
            print(f"  Store {sid}: ya tiene {existing} inventarios")
            continue
        for prod in products:
            if not prod.is_serializable:
                qty = random.randint(10, 100) if sid == 2 else random.randint(5, 50)
                db.add(Inventory(product_id=prod.product_id, store_id=sid, quantity=qty))
        db.flush()
        print(f"  ✅ Inventario creado para store {sid}")

    # --- VENTAS para Sucursal Norte (store_id=2): 15 ventas ---
    payment_methods = ["Efectivo", "Yape", "Tarjeta", "Efectivo", "Efectivo"]
    
    for sid, num_sales in [(2, 15), (3, 8)]:
        if sid not in store_ids:
            continue
        existing = db.query(Sale).filter(Sale.store_id == sid).count()
        if existing > 0:
            print(f"  Store {sid}: ya tiene {existing} ventas")
            continue
        
        series_prefix = f"B00{sid}"
        for i in range(num_sales):
            days_ago = random.randint(0, 9)
            hour = random.randint(9, 20)
            minute = random.randint(0, 59)
            sale_date = (datetime.now() - timedelta(days=days_ago)).replace(hour=hour, minute=minute, second=random.randint(0,59))
            
            num_items = random.randint(1, 3)
            sale_products = random.sample(products, min(num_items, len(products)))
            
            total = Decimal('0')
            details_data = []
            for prod in sale_products:
                qty = random.randint(1, 3)
                price = prod.base_price
                subtotal = price * qty
                total += subtotal
                details_data.append({
                    'product_id': prod.product_id,
                    'quantity': qty,
                    'unit_price': price,
                    'subtotal': subtotal
                })
            
            client = random.choice(clients) if random.random() > 0.4 else None
            method = random.choice(payment_methods)
            
            sale = Sale(
                store_id=sid,
                user_id=admin_user.user_id,
                client_id=client.client_id if client else None,
                total_amount=total,
                discount_amount=Decimal('0'),
                net_amount=total,
                date_created=sale_date,
                invoice_type='BOLETA',
                invoice_series=series_prefix,
                invoice_number=str(800 + i),
                sunat_status='ACEPTADO',
                hash_cpe=f'mock{random.randint(100000, 999999)}',
                points_earned=int(total // 10),
                points_used=0
            )
            db.add(sale)
            db.flush()
            
            for d in details_data:
                db.add(SaleDetail(
                    sale_id=sale.sale_id,
                    product_id=d['product_id'],
                    quantity=d['quantity'],
                    unit_price=d['unit_price'],
                    subtotal=d['subtotal']
                ))
            
            db.add(SalePayment(
                sale_id=sale.sale_id,
                method=method,
                amount=total
            ))
        
        db.flush()
        print(f"  ✅ {num_sales} ventas creadas para store {sid}")

    db.commit()
    
    # --- RESUMEN FINAL ---
    print("\n📊 RESUMEN:")
    for sid in [1, 2, 3]:
        count = db.query(Sale).filter(Sale.store_id == sid).count()
        store_name = db.query(Store).filter(Store.store_id == sid).first()
        name = store_name.name if store_name else f"Store {sid}"
        print(f"  {name}: {count} ventas")
    
    print("\n✅ ¡Seed completo!")

except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
