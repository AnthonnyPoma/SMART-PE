from pydantic import BaseModel
from typing import Optional

# --- BASE ---
class StoreBase(BaseModel):
    name: str
    address: str
    city: Optional[str] = None
    phone: Optional[str] = None
    ruc: Optional[str] = None

# --- CREAR ---
class StoreCreate(StoreBase):
    pass

# --- ACTUALIZAR (Todos opcionales) ---
class StoreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    ruc: Optional[str] = None
    status: Optional[bool] = None

# --- RESPUESTA ---
class StoreResponse(StoreBase):
    store_id: int
    status: bool
    employee_count: Optional[int] = 0  # Cantidad de empleados asignados
    
    class Config:
        from_attributes = True
