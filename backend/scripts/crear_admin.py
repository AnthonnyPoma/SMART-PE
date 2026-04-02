import sys
import os

# Agregamos el directorio actual al path
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.core.security import get_password_hash

# 👇 LISTA COMPLETA DE MODELOS (Basada en tu estructura de carpetas)
# Importamos TODO para evitar errores de "Failed to locate name"
from app.models import (
    user_model,
    role_model,
    store_model,
    product_model,
    category_model,           # <--- Faltaba
    inventory_movement_model, # <--- Faltaba
    supplier_model,           # <--- EL QUE CAUSABA TU ERROR ACTUAL
    client_model,
    sale_model
)

# Alias útiles
User = user_model.User
Role = role_model.Role
Store = store_model.Store

def crear_super_admin():
    db = SessionLocal()
    
    print("🔄 Iniciando creación de Super Admin...")

    try:
        # 1. Verificar/Crear Rol Admin
        rol_admin = db.query(Role).filter(Role.role_name == "admin").first()
        if not rol_admin:
            print("⚠️ No existe el rol 'admin'. Creándolo...")
            rol_admin = Role(role_id=1, role_name="admin")
            db.add(rol_admin)
            db.commit()

        # 2. Verificar/Crear Tienda Principal
        tienda = db.query(Store).filter(Store.store_id == 1).first()
        if not tienda:
            print("⚠️ No existe la Tienda #1. Creándola...")
            tienda = Store(store_id=1, name="Sede Central", address="Lima", city="Lima")
            db.add(tienda)
            db.commit()

        # 3. Eliminar usuario admin viejo si existe (Limpieza)
        usuario_existente = db.query(User).filter(User.username == "admin").first()
        if usuario_existente:
            print("🗑️ Eliminando usuario 'admin' antiguo...")
            db.delete(usuario_existente)
            db.commit()

        # 4. Crear el nuevo usuario
        password_plana = "123456"
        password_encriptada = get_password_hash(password_plana)

        nuevo_admin = User(
            username="admin",
            password_hash=password_encriptada,
            full_name="Administrador del Sistema",
            role_id=1,
            store_id=1,
            is_active=True,
            dni="00000000",
            email="admin@smartpe.com"
        )

        db.add(nuevo_admin)
        db.commit()
        
        print("\n✅ ¡ÉXITO TOTAL! Usuario 'admin' creado correctamente.")
        print(f"🔑 Usuario: admin")
        print(f"🔑 Contraseña: {password_plana}")
        print("🚀 Ahora intenta loguearte en el Frontend.")

    except Exception as e:
        print(f"\n❌ Ocurrió un error inesperado: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    crear_super_admin()