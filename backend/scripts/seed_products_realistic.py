"""
Actualización directa de productos usando IDs reales de la BD.
Resultado del diagnóstico:
  ID=1  Celulares  → iPhone 14 Pro
  ID=2  Celulares  → iPhone 17 Pro Max
  ID=6  Celulares  → SAMSUNG A25S 256GB
  ID=3  Audio      → Audífonos SONY
  ID=4  Laptops    → LAPTOP HP
  ID=5  Accesorios → CASE iPhone 15
  ID=7  Tablets    → iPad Air 2025
  ID=8  Smartwatch → Apple Watch Series 10
  + otros según categoría

Ejecutar desde: backend/
Run: venv\Scripts\python.exe scripts\seed_products_realistic.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = create_engine(DATABASE_URL)

# Leer todos los productos reales de la BD para mapear correctamente
with engine.connect() as conn:
    all_prods = conn.execute(text(
        "SELECT product_id, name, category_id FROM products ORDER BY product_id"
    )).fetchall()
    all_cats = conn.execute(text(
        "SELECT category_id, name FROM categories"
    )).fetchall()
    cat_map = {c[0]: c[1] for c in all_cats}

print("Productos en BD:")
prod_by_id = {}
for p in all_prods:
    print(f"  [{p[0]:3d}] [{cat_map.get(p[2], '?'):15s}] {p[1]}")
    prod_by_id[p[0]] = p

# ========================================================================
# Actualizaciones directas por ID
# Imágenes: CDN públicos de los fabricantes (sin hotlink protection)
# ========================================================================
UPDATES = [
    # --- CELULARES ---
    (1, "iPhone 14 Pro 256GB - Dorado", 3799.00,
     "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-1inch-gold?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703841898",
     "Chip A16 Bionic, sistema de cámaras Pro de 48MP, Dynamic Island, Always-On Display, acero inoxidable."),

    (2, "iPhone 15 Pro Max 256GB - Titanio Negro", 5299.00,
     "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-blacktitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708",
     "Chip A17 Pro, pantalla Super Retina XDR 6.7\", zoom óptico 5x, titanio aeroespacial, botón Acción."),

    (6, "Samsung Galaxy S24 Ultra 256GB - Negro Titanio", 4499.00,
     "https://images.samsung.com/pe/smartphones/galaxy-s24-ultra/images/galaxy-s24-ultra-highlights-color-titaniumblack-thum.jpg",
     "Dynamic AMOLED 2X 6.8\", S Pen integrado, cámara 200MP, procesador Snapdragon 8 Gen 3."),

    (3, "AirPods Pro 2da Generación (USB-C)", 1299.00,
     "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQD83?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1660803972361",
     "Cancelación activa de ruido, audio espacial personalizado, chip H2, estuche MagSafe USB-C."),

    (4, "MacBook Air M2 13\" 8GB 256GB - Gris Espacial", 6499.00,
     "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-space-gray-select-201810?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1603406702000",
     "Chip M2, pantalla Liquid Retina 13.6\", hasta 18 horas de batería, diseño ultradelgado sin ventilador."),

    (5, "Hub USB-C 7 en 1 con HDMI 4K y Ethernet", 249.00,
     "https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=500&q=80",
     "HDMI 4K@60Hz, 3x USB-A 3.0, lector SD/MicroSD, ethernet GbE, carga Pass-Through 100W, cuerpo de aluminio."),

    (7, "iPad Air M2 11\" 128GB Wi-Fi - Azul", 3799.00,
     "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/ipad-air-finish-unselect-gallery-1-202405?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1713920820513",
     "Chip M2, pantalla Liquid Retina 11\", compatible con Apple Pencil Pro y Magic Keyboard Folio."),

    (8, "Apple Watch Series 9 45mm Aluminio Medianoche", 1899.00,
     "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/watch-s9-45mm-midnight-alum-midnight-sportsband-f?wid=752&hei=720&trim=1&fmt=p-jpg&qlt=80&.v=1694507901022",
     "Chip S9 SiP, doble toque, pantalla 2000 nits, ECG, temperatura corporal, hasta 18 horas de batería."),
]

# Agregar el resto de productos encontrados en la BD con updates genéricas por categoría
EXTRA_UPDATES_BY_CAT = {
    "Cámaras": ("GoPro HERO 13 Black + Kit Accesorios", 1999.00,
        "https://gopro.com/content/dam/help/hero13-black/HERO13Black_Front_Back_Left.png",
        "Video 5.3K/60fps, HyperSmooth 6.0, batería endurance +70%, sumergible hasta 10m sin case."),
    "HOGAR": ("Parlante JBL Charge 5 Bluetooth Portátil", 549.00,
        "https://www.jbl.com/dw/image/v2/AAUJ_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw6cdb2b80/JBL_CHARGE5_Hero_BlackSteel_32533_x2.png?sw=480&sh=480&sm=fit",
        "Sonido JBL Pro 360°, batería 20 horas, resistencia IP67, Power Bank integrado, graves potentes."),
    "Cómputo": ("PC Gamer Intel i7 + RTX 4060 + 16GB RAM", 6999.00,
        "https://dlcdnwebimgs.asus.com/gain/3E3E6BA4-9B5F-4229-A777-78D33A6D4CDD/w800",
        "Intel Core i7 12a gen, RTX 4060 8GB GDDR6, 16GB DDR5, SSD 1TB NVMe PCIe 4.0, enfriamiento líquido."),
}

print("\n" + "="*70)
print("APLICANDO ACTUALIZACIONES...")
print("="*70)

with engine.begin() as conn:
    done = 0
    for (pid, name, price, img_url, description) in UPDATES:
        if pid not in prod_by_id:
            print(f"  ⚠️  ID {pid} no existe en BD, saltando...")
            continue
        conn.execute(text("""
            UPDATE products 
            SET name = :name, base_price = :price, image_url = :img, description = :desc
            WHERE product_id = :pid
        """), {"name": name, "price": price, "img": img_url, "desc": description, "pid": pid})
        print(f"  ✅ [{pid:3d}] {name[:55]}")
        done += 1

    # Aplicar extras a categorías que no están en la lista manual
    used_ids = {u[0] for u in UPDATES}
    for p in all_prods:
        if p[0] in used_ids:
            continue
        cat_name = cat_map.get(p[2], "")
        if cat_name in EXTRA_UPDATES_BY_CAT:
            name, price, img_url, description = EXTRA_UPDATES_BY_CAT.pop(cat_name)
            conn.execute(text("""
                UPDATE products 
                SET name = :name, base_price = :price, image_url = :img, description = :desc
                WHERE product_id = :pid
            """), {"name": name, "price": price, "img": img_url, "desc": description, "pid": p[0]})
            print(f"  ✅ [{p[0]:3d}] {name[:55]} (cat: {cat_name})")
            done += 1

print(f"\n{'='*70}")
print(f"  Total actualizados: {done}")
print(f"{'='*70}")
print("\n✅ Productos actualizados exitosamente.\n")
