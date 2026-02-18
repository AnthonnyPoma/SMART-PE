from app.core.database import SessionLocal
from app.models.sale_model import Sale

def check_sales_status():
    db = SessionLocal()
    try:
        # Traer las ultimas 10 ventas solo NC
        sales = db.query(Sale).filter(Sale.invoice_type == 'NC', Sale.sale_id > 60).all()
        
        print(f"{'ID':<6} | {'STATUS':<12} | {'TYPE':<10} | {'SERIE':<6} | {'NUMERO':<10}")
        print("-" * 55)
        
        for sale in sales:
            print(f"{sale.sale_id:<6} | {sale.sunat_status:<12} | {sale.invoice_type:<10} | {str(sale.invoice_series):<6} | {str(sale.invoice_number):<10}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_sales_status()
