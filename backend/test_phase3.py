from fastapi import BackgroundTasks
from app.core.database import SessionLocal
from app.models.sale_model import Sale, SaleDetail
from app.models.user_model import User
from app.models.store_model import Store
from app.models.product_model import Product
from app.routers.sales import void_sale, process_sale
from app.schemas.sale_schema import VoidSaleRequest
from app.services.sunat.emission_service import process_sunat_emission
import time

def test_phase3():
    db = SessionLocal()
    try:
        print("🚀 Iniciando Prueba Fase 3: Notas de Crédito")

        # 1. Preparar Datos (Usuario y Tienda)
        user = db.query(User).first()
        store = db.query(Store).first()
        # Asegurar producto
        product = db.query(Product).first()
        if not product:
            from app.models.category_model import Category
            cat = db.query(Category).first()
            if not cat:
                print("Creando categoria...")
                cat = Category(name="General", description="General")
                db.add(cat)
                db.commit()
            
            print("Creando producto...")
            product = Product(
                name="Producto Test", 
                base_price=100.0, 
                stock=100, 
                category_id=cat.category_id,
                store_id=store.store_id,
                sku=f"SKU_{int(time.time())}" # SKU unico
            )
            db.add(product)
            db.commit()
            
        print(f"📦 Producto usado: {product.product_id}")

        # 2. Crear una Venta "ACEPTADA" (Simulada)
        print("Creando Venta Original...")
        # Creamos venta directo en BD para ahorrar tiempo
        original_sale = Sale(
            store_id=store.store_id,
            user_id=user.user_id,
            total_amount=200.00,
            net_amount=200.00,
            invoice_type='BOLETA',
            sunat_status='PENDIENTE', # PENDIENTE PARA EMITIR
            invoice_series='B001',
            invoice_number=str(int(time.time() * 1000) % 100000000), # Numero unico con ms
            hash_cpe=None,
            points_earned=20
        )
        db.add(original_sale)
        db.commit()
        db.refresh(original_sale)
        
        print("Agregando Detalle...")
        # Agregar detalle
        detail = SaleDetail(sale_id=original_sale.sale_id, product_id=product.product_id, quantity=2, unit_price=100, subtotal=200)
        db.add(detail)
        db.commit()
        
        print(f"✅ Venta Original creada: ID {original_sale.sale_id} (PENDIENTE)")
        
        # 2b. EMITIR VENTA ORIGINAL A SUNAT
        print(f"🚀 Emitiendo Venta Original #{original_sale.sale_id}...")
        process_sunat_emission(original_sale.sale_id)
        
        # Verificar que fue aceptada
        db.refresh(original_sale)
        if original_sale.sunat_status != "ACEPTADO":
            print(f"❌ Error: Venta original no fue aceptada. Estado: {original_sale.sunat_status}")
            # Intenta leer el error del log reciente (si estuviera en una variable global o archivo)
            # Pero emission_service imprime a stdout.
            return
            
        print("✅ Venta Original ACEPTADA por SUNAT.")

        # 3. Ejecutar ANULACIÓN (Void)
        print("🔄 Ejecutando anulación...")
        void_req = VoidSaleRequest(reason="Devolución por falla")
        bg_tasks = BackgroundTasks()
        
        # Llamamos al endpoint function directamente
        result = void_sale(
            sale_id=original_sale.sale_id,
            void_data=void_req,
            background_tasks=bg_tasks,
            db=db,
            current_user=user
        )
        
        print(f"   Resultado Endpoint: {result}")
        nc_id = result["credit_note_id"]

        # 4. Procesar Emisión de la NC (Simular Background Task)
        print(f"🚀 Procesando emisión SUNAT para NC #{nc_id}...")
        process_sunat_emission(nc_id)
        
        # 5. Verificar Resultado
        db.expire_all()
        nc_sale = db.query(Sale).filter(Sale.sale_id == nc_id).first()
        
        print(f"\n📊 Estado Nota de Crédito #{nc_id}:")
        print(f"   - Tipo: {nc_sale.invoice_type}")
        print(f"   - Relacionado a: {nc_sale.related_sale_id}")
        print(f"   - Status SUNAT: {nc_sale.sunat_status}")
        print(f"   - Hash CPE: {nc_sale.hash_cpe}")
        
        if nc_sale.sunat_status == "ACEPTADO" and nc_sale.related_sale_id == original_sale.sale_id:
            print("\n✅ PRUEBA EXITOSA: Nota de Crédito generada y aceptada.")
        else:
            print("\n❌ PRUEBA FALLIDA.")

    except Exception as e:
        print(f"❌ Error en test: {e}")
        try:
            print(f"ORIG: {e.orig}")
        except:
            pass
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_phase3()
