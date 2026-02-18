from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

# Configuración de Hashing (Bcrypt es el estándar de oro)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración del Token
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # El token dura 30 mins

def verify_password(plain_password, hashed_password):
    """Verifica si la contraseña escrita coincide con el hash guardado"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Convierte texto plano a hash seguro"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Genera el JWT (JSON Web Token)"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    # Usa la clave secreta de tu .env
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt