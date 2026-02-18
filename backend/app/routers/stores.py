from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.dependencies import get_current_user

# Models
from app.models.store_model import Store
from app.models.user_model import User

# Schemas
from app.schemas.store_schema import StoreCreate, StoreUpdate, StoreResponse

router = APIRouter()

# 1. LISTAR TODAS LAS TIENDAS
@router.get("/", response_model=List[StoreResponse])
def list_stores(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar todas las tiendas. Por defecto solo activas."""
    query = db.query(Store)
    
    if not include_inactive:
        query = query.filter(Store.status == True)
    
    stores = query.all()
    
    # Agregar contador de empleados
    result = []
    for store in stores:
        employee_count = db.query(User).filter(User.store_id == store.store_id, User.is_active == True).count()
        result.append({
            "store_id": store.store_id,
            "name": store.name,
            "address": store.address,
            "city": store.city,
            "phone": store.phone,
            "ruc": store.ruc,
            "status": store.status,
            "employee_count": employee_count
        })
    
    return result

# 2. LISTAR PERSONAL DE UNA TIENDA (ANTES del GET genérico para evitar conflicto)
@router.get("/{store_id}/users")
def get_store_users(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Listar todos los empleados asignados a una tienda."""
    from sqlalchemy.orm import joinedload
    
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    users = db.query(User).options(joinedload(User.role)).filter(
        User.store_id == store_id, 
        User.is_active == True
    ).all()
    
    return [{
        "user_id": u.user_id,
        "username": u.username,
        "full_name": u.full_name,
        "role": u.role.name if u.role else "Sin rol",
        "email": u.email,
        "phone": u.phone
    } for u in users]

# 3. VER DETALLE DE TIENDA
@router.get("/{store_id}", response_model=StoreResponse)
def get_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtener información de una tienda específica."""
    store = db.query(Store).filter(Store.store_id == store_id).first()
    
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    employee_count = db.query(User).filter(User.store_id == store_id, User.is_active == True).count()
    
    return {
        "store_id": store.store_id,
        "name": store.name,
        "address": store.address,
        "city": store.city,
        "phone": store.phone,
        "ruc": store.ruc,
        "status": store.status,
        "employee_count": employee_count
    }

# 4. CREAR NUEVA TIENDA
@router.post("/", response_model=StoreResponse)
def create_store(
    store_data: StoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crear nueva tienda. Solo Admin."""
    # Validar permisos
    if current_user.role.name.lower() not in ['admin', 'administrador']:
        raise HTTPException(status_code=403, detail="No tienes permisos para crear tiendas")
    
    # Validar nombre único
    existing = db.query(Store).filter(Store.name == store_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una tienda con el nombre '{store_data.name}'")
    
    new_store = Store(
        name=store_data.name,
        address=store_data.address,
        city=store_data.city,
        phone=store_data.phone,
        ruc=store_data.ruc,
        status=True
    )
    
    db.add(new_store)
    db.commit()
    db.refresh(new_store)
    
    return {
        "store_id": new_store.store_id,
        "name": new_store.name,
        "address": new_store.address,
        "city": new_store.city,
        "phone": new_store.phone,
        "ruc": new_store.ruc,
        "status": new_store.status,
        "employee_count": 0
    }

# 5. ACTUALIZAR TIENDA
@router.put("/{store_id}", response_model=StoreResponse)
def update_store(
    store_id: int,
    store_data: StoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualizar información de tienda. Solo Admin."""
    # Validar permisos
    if current_user.role.name.lower() not in ['admin', 'administrador']:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar tiendas")
    
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Actualizar solo campos proporcionados
    update_data = store_data.model_dump(exclude_unset=True)
    
    # Si se cambia el nombre, validar unicidad
    if 'name' in update_data and update_data['name'] != store.name:
        existing = db.query(Store).filter(Store.name == update_data['name']).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe una tienda con el nombre '{update_data['name']}'")
    
    for key, value in update_data.items():
        setattr(store, key, value)
    
    db.commit()
    db.refresh(store)
    
    employee_count = db.query(User).filter(User.store_id == store_id, User.is_active == True).count()
    
    return {
        "store_id": store.store_id,
        "name": store.name,
        "address": store.address,
        "city": store.city,
        "phone": store.phone,
        "ruc": store.ruc,
        "status": store.status,
        "employee_count": employee_count
    }

# 6. DESACTIVAR TIENDA (Soft Delete)
@router.delete("/{store_id}")
def deactivate_store(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Desactivar tienda. Solo Admin."""
    # Validar permisos
    if current_user.role.name.lower() not in ['admin', 'administrador']:
        raise HTTPException(status_code=403, detail="No tienes permisos para desactivar tiendas")
    
    store = db.query(Store).filter(Store.store_id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")
    
    # Validar que no tenga empleados activos
    employee_count = db.query(User).filter(User.store_id == store_id, User.is_active == True).count()
    if employee_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede desactivar. La tienda tiene {employee_count} empleado(s) asignado(s)"
        )
    
    store.status = False
    db.commit()
    
    return {"message": f"Tienda '{store.name}' desactivada correctamente"}
