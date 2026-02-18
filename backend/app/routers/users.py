from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user_model import User
from app.schemas.user_schema import UserCreate, UserResponse 
from passlib.context import CryptContext
from sqlalchemy import text # 👈 1. IMPORTA ESTO (IMPORTANTE)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
router = APIRouter()

# --- SCHEMA AUXILIAR PARA ACTUALIZAR ---
class UserUpdate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role_id: int
    is_active: bool
    password: Optional[str] = None 

# --- SCHEMA AUXILIAR PARA ROLES ---
class RoleResponse(BaseModel):
    role_id: int
    name: str
    class Config:
        from_attributes = True

def get_password_hash(password):
    return pwd_context.hash(password)

from app.dependencies import get_current_user # Importar dependencia

# 1. LISTAR USUARIOS (GET /users/)
@router.get("/", response_model=List[UserResponse])
def read_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista los usuarios.
    - Si es SuperAdmin (role 1 global?), podría ver todos.
    - Por defecto, filtramos por la tienda del usuario actual para aislamiento.
    """
    # Lógica de aislamiento: Solo ver usuarios de MI tienda
    # (A menos que implementemos un rol 'God Mode' mas adelante)
    users = db.query(User).filter(User.store_id == current_user.store_id).offset(skip).limit(limit).all()
    return users

# 2. CREAR USUARIO (POST /users/)
@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    if user.dni and db.query(User).filter(User.dni == user.dni).first():
        raise HTTPException(status_code=400, detail="El DNI ya está registrado")

    hashed_password = get_password_hash(user.password)
    
    new_user = User(
        username=user.username,
        password_hash=hashed_password,
        role_id=user.role_id,
        store_id=user.store_id,
        full_name=user.full_name,
        dni=user.dni,
        email=user.email,
        phone=user.phone,
        address=user.address,
        is_active=user.is_active
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 3. ACTUALIZAR USUARIO (PUT /users/{id})
@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.user_id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Actualizar campos
    db_user.full_name = user_update.full_name
    db_user.email = user_update.email
    db_user.phone = user_update.phone
    db_user.address = user_update.address
    db_user.role_id = user_update.role_id
    db_user.is_active = user_update.is_active

    if user_update.password and len(user_update.password) > 0:
        db_user.password_hash = get_password_hash(user_update.password)

    db.commit()
    db.refresh(db_user)
    return db_user

# 4. LISTAR ROLES (GET /users/roles)
@router.get("/roles", response_model=List[RoleResponse])
def read_roles(db: Session = Depends(get_db)):
    results = db.execute(text("SELECT role_id, name FROM roles")).fetchall()
    return [{"role_id": r[0], "name": r[1]} for r in results]

# 5. ASIGNAR TIENDA A USUARIO (PUT /users/{id}/assign-store)
@router.put("/{user_id}/assign-store")
def assign_store_to_user(
    user_id: int,
    store_id: int,
    db: Session = Depends(get_db)
):
    """Asignar o cambiar tienda de un empleado."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Validar que la tienda existe
    from app.models.store_model import Store
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    user.store_id = store_id
    db.commit()
    
    return {"message": f"Usuario '{user.username}' asignado a tienda '{store.name}'"}
