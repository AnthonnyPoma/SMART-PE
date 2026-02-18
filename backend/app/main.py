from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.models import (
    user_model, role_model, store_model, product_model, sale_model, 
    client_model, inventory_movement_model, supplier_model, 
    category_model, transfer_model, promotion_model, cash_model,
    loyalty_model
)
from app.routers import (
    inventory, sales, auth, dashboard, users, suppliers, 
    clients, transfers, stores, promotions, billing, cash,
    loyalty, reports # 👈 Fase 8
)

# Crear las tablas en la base de datos (si no existen)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SMART PE API", version="1.0.0")

# ==========================================
# CONFIGURACIÓN DE CORS (Permisos)
# ==========================================
origins = [
    "http://localhost:5173",      # Frontend Vite
    "http://127.0.0.1:5173",      # Alternativa por IP
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ==========================================

# Registrar las rutas
app.include_router(inventory.router, tags=["Inventario"])
app.include_router(sales.router, tags=["Ventas (POS)"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(users.router, prefix="/users", tags=["Users"]) 
app.include_router(suppliers.router, prefix="/suppliers", tags=["Suppliers"]) 
app.include_router(clients.router, prefix="/clients", tags=["Clients"]) 
app.include_router(transfers.router, prefix="/transfers", tags=["Transfers"])
app.include_router(stores.router, prefix="/stores", tags=["Stores"])
app.include_router(promotions.router, prefix="/promotions", tags=["Promotions"])
app.include_router(billing.router, tags=["Facturación"]) # Integración SUNAT
app.include_router(cash.router, prefix="/cash", tags=["Caja (Arqueo)"])
app.include_router(loyalty.router, prefix="/loyalty", tags=["Fidelización"])
app.include_router(reports.router, prefix="/reports", tags=["Reportes"]) # 👈 Fase 8

@app.get("/")
def read_root():
    return {"mensaje": "Bienvenido al Backend de SMART PE"}







## NO BORRAR LAS 2 LINEA DE ABAJO
## .\venv\Scripts\activate
## uvicorn app.main:app --reload
