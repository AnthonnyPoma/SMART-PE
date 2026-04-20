from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.models import (
    user_model, role_model, store_model, product_model, sale_model, 
    client_model, inventory_movement_model, supplier_model, 
    category_model, transfer_model, promotion_model, cash_model,
    loyalty_model, audit_model, rma_model, setting_model, web_order_model
)
from app.routers import (
    inventory, sales, auth, dashboard, users, suppliers, 
    clients, transfers, stores, promotions, billing, cash,
    loyalty, reports, purchases, api_integrations, hr, audits, rmas, settings, shop
)

import sentry_sdk
import os
from dotenv import load_dotenv

load_dotenv(override=True)

SENTRY_DSN = os.getenv("SENTRY_DSN")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1 if ENVIRONMENT == "production" else 1.0,
        profiles_sample_rate=0.0,  
        environment=ENVIRONMENT,
        send_default_pii=False,
    )

# ── Configuración de la API ───────────────────────────────────────────────
docs_url    = None if ENVIRONMENT == "production" else "/docs"
redoc_url   = None if ENVIRONMENT == "production" else "/redoc"
openapi_url = None if ENVIRONMENT == "production" else "/openapi.json"

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SMART PE API",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# ── CORS ────────────────────────────────────────────────────────────────────────
_default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
_raw = os.getenv("CORS_ORIGINS", _default_origins)
origins = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(inventory.router, tags=["Inventario"])
app.include_router(sales.router, tags=["Ventas (POS)"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(users.router, prefix="/users", tags=["Users"]) 
app.include_router(suppliers.router, prefix="/suppliers", tags=["Suppliers"]) 
app.include_router(shop.router, prefix="/shop", tags=["Tienda Web Pública (E-Commerce)"])
app.include_router(clients.router, prefix="/clients", tags=["Clients"]) 
app.include_router(transfers.router, prefix="/transfers", tags=["Transfers"])
app.include_router(stores.router, prefix="/stores", tags=["Stores"])
app.include_router(promotions.router, prefix="/promotions", tags=["Promotions"])
app.include_router(billing.router, tags=["Facturación"]) 
app.include_router(cash.router, prefix="/cash", tags=["Caja (Arqueo)"])
app.include_router(loyalty.router, prefix="/loyalty", tags=["Fidelización"])
app.include_router(reports.router, prefix="/reports", tags=["Reportes"]) 
app.include_router(purchases.router, prefix="/purchases", tags=["Compras y Órdenes"]) 
app.include_router(api_integrations.router, prefix="/external", tags=["Integraciones Externas"])
app.include_router(hr.router, prefix="/hr", tags=["RRHH y Comisiones"])
app.include_router(audits.router, prefix="/audits", tags=["Auditoría Ciega"])
app.include_router(rmas.router, prefix="/rma", tags=["Garantías RMA"])
app.include_router(settings.router, prefix="/settings", tags=["Configuración"])

@app.get("/")
def read_root():
    return {"mensaje": "Bienvenido al Backend de SMART PE"}







## Comandos de desarrollo:
## .\venv\Scripts\activate
## uvicorn app.main:app --reload

