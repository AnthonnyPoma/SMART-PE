import requests
from app.core.database import SessionLocal
from app.models.user_model import User
from app.models.cash_model import CashRegister
import sys

# CONFIG
BASE_URL = "http://localhost:8000"
DB_SESSION = SessionLocal()

def get_admin_token():
    # Asumimos que existe user 'admin' pass '123456' del seed
    data = {"username": "admin", "password": "password123"} 
    # Si no funciona password123, intenta 123456 en tu entorno local user
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data=data)
        if response.status_code == 200:
            return response.json()["access_token"]
        print("Login fallido con password123, probando 123456")
        data["password"] = "123456"
        response = requests.post(f"{BASE_URL}/auth/login", data=data)
        return response.json()["access_token"]
    except Exception as e:
        print(f"Error login: {e}")
        sys.exit(1)

def cleanup_cash():
    # Limpiar cajas abiertas del admin para test limpio
    admin = DB_SESSION.query(User).filter(User.username == "admin").first()
    if not admin:
        print("Admin no encontrado")
        sys.exit(1)
        
    registers = DB_SESSION.query(CashRegister).filter(CashRegister.user_id == admin.user_id).all()
    for r in registers:
        DB_SESSION.delete(r)
    DB_SESSION.commit()
    print("🧹 Cajas limpiadas")

def run_test():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n1. Verificar Status Inicial (Debe ser False)")
    res = requests.get(f"{BASE_URL}/cash/status", headers=headers)
    print(res.json())
    if res.json()["has_open_register"]:
        print("❌ Error: Debería estar cerrada tras limpieza")
        # return

    print("\n2. Intentar Vender con Caja Cerrada (Debe fallar 403)")
    sale_payload = {
        "store_id": 1,
        "payment_method": "Efectivo",
        "items": [
            {"product_id": 1, "quantity": 1} # Asumimos prod 1 existe
        ]
    }
    res = requests.post(f"{BASE_URL}/sales/checkout", json=sale_payload, headers=headers)
    print(f"Status: {res.status_code} - {res.json()}")
    if res.status_code != 403:
        print("❌ Error: Permitio vender sin caja")
    else:
        print("✅ Bloqueo correcto")

    print("\n3. Abrir Caja (Monto S/ 100)")
    open_payload = {"store_id": 1, "start_amount": 100.0}
    res = requests.post(f"{BASE_URL}/cash/open", json=open_payload, headers=headers)
    print(res.json())
    if res.status_code == 200:
        print("✅ Caja Abierta")
    else:
        print("❌ Error abriendo caja")
        
    print("\n4. Verificar Status Abierto")
    res = requests.get(f"{BASE_URL}/cash/status", headers=headers)
    status_data = res.json()
    print(f"Balance Actual: {status_data['current_balance']}")
    
    print("\n5. Vender S/ 500 en Efectivo")
    # Asegurar producto con precio
    # (Omitimos este paso si confiamos en que existe producto 1, si falla, ajustar ID)
    sale_payload["items"][0]["quantity"] = 1 # Ajustar segun precio prod 1 para que note diferencia
    res = requests.post(f"{BASE_URL}/sales/checkout", json=sale_payload, headers=headers)
    if res.status_code == 200:
        sale_total = res.json()["total_amount"]
        print(f"✅ Venta OK. Total: {sale_total}")
    else:
        print(f"❌ Venta Fallida: {res.text}")
        sale_total = 0

    print("\n6. Verificar Balance (Debe ser 100 + Venta)")
    res = requests.get(f"{BASE_URL}/cash/status", headers=headers)
    new_balance = res.json()['current_balance']
    print(f"Nuevo Balance: {new_balance}")
    
    if new_balance == (100.0 + sale_total):
        print("✅ Cuadre Perfecto")
    else:
        print("⚠️ Cuadre Incorrecto (puede haber otros factores)")

    print("\n7. Cerrar Caja (Arqueo)")
    # Simulamos que contamos exactamente lo que dice el sistema
    close_payload = {"final_amount_real": new_balance, "notes": "Cierre test"}
    res = requests.post(f"{BASE_URL}/cash/close", json=close_payload, headers=headers)
    print(res.json())
    
    register = res.json()
    if register["status"] == "CLOSED" and register["difference"] == 0:
        print("✅ Cierre Exitoso y sin diferencias")
    else:
        print("❌ Error en cierre")

if __name__ == "__main__":
    cleanup_cash()
    run_test()
