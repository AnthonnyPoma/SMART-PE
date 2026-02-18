import sys
print("Python version:", sys.version)

try:
    print("Importing database...")
    from app.core.database import Base
    print("OK")
except Exception as e:
    print("FAIL database:", e)

models = [
    "user_model", 
    "role_model", 
    "store_model", 
    "product_model", 
    "sale_model", 
    "client_model",
    "inventory_movement_model", 
    "supplier_model", 
    "category_model"
]

for m in models:
    try:
        print(f"Importing {m}...")
        exec(f"from app.models import {m}")
        print(f"OK {m}")
    except Exception as e:
        print(f"FAIL {m}: {e}")
        import traceback
        traceback.print_exc()

print("All imports OK. Testing create_all...")

print("Testing FastAPI app initialization...")
try:
    from app.main import app
    print("FastAPI App initialized OK")
except Exception as e:
    print("FAIL app.main:", e)
    import traceback
    traceback.print_exc()


