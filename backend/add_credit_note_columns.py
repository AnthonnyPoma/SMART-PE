from app.core.database import engine
from sqlalchemy import text

def add_columns():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE sales ADD COLUMN related_sale_id INTEGER REFERENCES sales(sale_id)"))
            print("✅ Columna related_sale_id agregada.")
        except Exception as e:
            print(f"⚠️ related_sale_id ya existe o error: {e}")

        try:
            conn.execute(text("ALTER TABLE sales ADD COLUMN credit_note_reason VARCHAR(200)"))
            print("✅ Columna credit_note_reason agregada.")
        except Exception as e:
            print(f"⚠️ credit_note_reason ya existe o error: {e}")
            
        conn.commit()

if __name__ == "__main__":
    add_columns()
