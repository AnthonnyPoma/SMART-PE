from app.core.database import SessionLocal
from app.models.product_model import Product, ProductSeries, Inventory
from sqlalchemy import func
import sys

# Set stdout to utf-8 just in case
sys.stdout.reconfigure(encoding='utf-8')

def debug_stock():
    db = SessionLocal()
    try:
        # 1. Buscar el producto iPhone 17 Pro Max
        product = db.query(Product).filter(Product.name.like("%iPhone 17%")).first()
        
        with open("stock_log.txt", "w", encoding="utf-8") as f:
            if not product:
                f.write("Producto no encontrado\n")
                return

            f.write(f"Producto: {product.name} (ID: {product.product_id})\n")
            f.write(f"   Es serializable: {product.is_serializable}\n")

            # 2. Contar Series Disponibles por Tienda
            f.write("\nSeries por Tienda (Status='disponible'):\n")
            stats = db.query(
                ProductSeries.store_id, 
                func.count(ProductSeries.series_id)
            ).filter(
                ProductSeries.product_id == product.product_id,
                ProductSeries.status == 'disponible'
            ).group_by(ProductSeries.store_id).all()

            for store_id, count in stats:
                f.write(f"   Store {store_id}: {count}\n")

            # 3. Listar Series Específicas
            f.write("\nDetalle de Series (TODAS LAS TIENDAS):\n")
            series = db.query(ProductSeries).filter(
                ProductSeries.product_id == product.product_id
            ).all()

            for s in series:
                f.write(f"   - {s.serial_number} | Status: {s.status} | ID: {s.series_id} | Store: {s.store_id}\n")

            # 4. Chequear Duplicados de Serial
            f.write("\nChequeando duplicados globales de Serial Number:\n")
            dupes = db.query(
                ProductSeries.serial_number, 
                func.count(ProductSeries.serial_number)
            ).group_by(ProductSeries.serial_number).having(func.count(ProductSeries.serial_number) > 1).all()

            if dupes:
                for serial, count in dupes:
                    f.write(f"   DUPLICADO: {serial} (x{count})\n")
            else:
                f.write("   No se encontraron duplicados de Serial Number.\n")

    except Exception as e:
        with open("stock_log.txt", "a", encoding="utf-8") as f:
            f.write(f"\nERROR: {str(e)}\n")
    finally:
        db.close()

if __name__ == "__main__":
    debug_stock()
