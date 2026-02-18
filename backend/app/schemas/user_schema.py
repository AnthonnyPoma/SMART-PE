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

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    user_id: int
    role_name: Optional[str] = None 

    class Config:
        from_attributes = True