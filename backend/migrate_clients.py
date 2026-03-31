import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment.")
    exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE clients ADD COLUMN accepts_marketing BOOLEAN DEFAULT FALSE;"))
        conn.commit()
        print("✅ Columna 'accepts_marketing' añadida a 'clients' correctamente.")
    except Exception as e:
        print(f"⚠️ Error (posiblemente la columna ya existe): {e}")
