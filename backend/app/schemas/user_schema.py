from pydantic import BaseModel
from typing import Optional

# 1. AUTENTICACIÓN
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# 2. USUARIOS
class UserBase(BaseModel):
    username: str
    role_id: int 
    store_id: int
    
    # Campos Opcionales (RRHH)
    full_name: Optional[str] = None
    dni: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = True
    supervisor_pin: Optional[str] = None
    
    # Campos de RRHH y comisiones
    commission_rate: Optional[float] = 0.0
    monthly_goal: Optional[float] = 0.0

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    commission_rate: Optional[float] = None
    monthly_goal: Optional[float] = None
    supervisor_pin: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    user_id: int
    role_name: Optional[str] = None 

    class Config:
        from_attributes = True