"""
Script de diagnóstico: lista los productos y categorías en la BD de producción.
Ejecutar desde: backend/
Run: venv\Scripts\python.exe scripts\check_products.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: No se encontró DATABASE_URL en .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    productos = conn.execute(text("SELECT product_id, sku, name, base_price, category_id, image_url FROM products ORDER BY category_id, product_id")).fetchall()
    print(f"\n{'='*80}")
    print(f"PRODUCTOS ACTUALES EN BASE DE DATOS ({len(productos)} total)")
    print(f"{'='*80}")
    for p in productos:
        imagen = "SI" if p[5] else "NO"
        print(f"  ID={p[0]:3d} | Cat={str(p[4]):4s} | S/{p[3]:8.2f} | Img={imagen} | {p[2][:50]}")

    cats = conn.execute(text("SELECT category_id, name, parent_id FROM categories ORDER BY parent_id NULLS FIRST, category_id")).fetchall()
    print(f"\n{'='*80}")
    print(f"CATEGORÍAS ({len(cats)} total)")
    print(f"{'='*80}")
    for c in cats:
        prefix = "  └─ " if c[2] else ""
        print(f"  ID={c[0]:3d} | Parent={str(c[2]):6s} | {prefix}{c[1]}")
