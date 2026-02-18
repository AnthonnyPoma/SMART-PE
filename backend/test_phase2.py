import sys
import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.sale_model import Sale, SaleDetail
from app.models.user_model import User
from app.models.store_model import Store
from app.services.sunat.emission_service import process_sunat_emission
from datetime import datetime
import time

def create_dummy_sale(db: Session):
    # Asegurar que existe tienda y usuario
    store = db.query(Store).first()
    user = db.query(User).first()
    
    if not store or not user:
        print("❌ Error: No hay tienda o usuario en BD para crear venta.")
        return None

    # Crear venta pendiente
    new_sale = Sale(
        store_id=store.store_id,
        user_id=user.user_id,
        total_amount=100.00,
        net_amount=100.00,
        invoice_type='BOLETA',
        sunat_status='PENDIENTE',
        points_earned=10
    )
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    
    # Agregar detalle
    detail = SaleDetail(
        sale_id=new_sale.sale_id,
        product_id=1, # Asumimos producto 1 existe
        quantity=1,
        unit_price=100.00,
        subtotal=100.00
    )
    db.add(detail)
    db.commit()
    
    print(f"✅ Venta Dummy creada: ID {new_sale.sale_id} (PENDIENTE)")
    return new_sale.sale_id

def test_phase2():
    db = SessionLocal()
    try:
        # 1. Crear Venta
        sale_id = create_dummy_sale(db)
        if not sale_id: return

        # 2. Ejecutar Emisión (Simulando Background Task)
        print("🚀 Ejecutando process_sunat_emission()...")
        process_sunat_emission(sale_id)
        
        # 3. Verificar Resultados en BD
        db.expire_all() # Refrescar cache
        sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
        
        print(f"\n📊 Estado Final Venta #{sale_id}:")
        print(f"   - SUNAT Status: {sale.sunat_status}")
        print(f"   - Hash CPE: {sale.hash_cpe}")
        
        if sale.sunat_status == "ACEPTADO" and sale.hash_cpe:
             print("\n✅ PRUEBA APROBADA: Emisión exitosa y Hash guardado.")
        else:
             print("\n❌ PRUEBA FALLIDA: No se actualizó correctamente.")

    except Exception as e:
        print(f"❌ Error en test: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_phase2()
