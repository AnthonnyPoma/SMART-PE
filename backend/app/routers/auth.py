from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
# Asegúrate de que verify_password coincida con la encriptación de users.py
# Si users.py usaba passlib localmente, verify_password debe poder leerlo.
from app.core.security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.models.user_model import User
from app.schemas.user_schema import Token

router = APIRouter()

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Buscar usuario
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    
    # 2. Verificar contraseña
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario inactivo/bloqueado")

    # 3. Obtener Rol (DINÁMICO desde BD) 🛡️
    # Usa la relación ORM para obtener el nombre real del rol desde la tabla 'roles'
    role_name = "empleado"  # Fallback seguro
    if user.role:
        role_name = user.role.name

    # 3.1 Obtener Nombre de Tienda para UI
    store_name = "Sin Asignar"
    if user.store_id:
        from app.models.store_model import Store
        store_obj = db.query(Store).filter(Store.store_id == user.store_id).first()
        if store_obj:
             store_name = store_obj.name

    # 3.2 Obtener Nombre Completo
    full_name = user.full_name
    if not full_name:
        full_name = user.username

    # 4. Generar Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "role": role_name,     # Enviamos "cajero" o "admin"
            "user_id": user.user_id,
            "store_id": user.store_id,
            "store_name": store_name,
            "full_name": full_name
        },
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}