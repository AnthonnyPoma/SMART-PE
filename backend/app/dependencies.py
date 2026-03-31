from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user_model import User

# Esto le dice a Swagger: "Si necesitas un token, ve a la ruta /login a buscarlo"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Decodificar el Token usando la CLAVE SECRETA
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # 2. Buscar si el usuario aún existe en la BD
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user


# =============================================
# 🛡️ H-03: MIDDLEWARE DE AUTORIZACIÓN POR ROL
# =============================================
def require_role(*allowed_roles: str):
    """
    Dependency que verifica que el usuario autenticado tenga uno de los roles permitidos.
    Uso: current_user: User = Depends(require_role("admin", "almacenero"))
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        # Obtener el nombre del rol desde la relación ORM
        user_role = None
        if current_user.role:
            user_role = current_user.role.name
        
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere rol: {', '.join(allowed_roles)}. Tu rol: {user_role or 'Sin rol'}"
            )
        return current_user
    return role_checker


# Atajos comunes
require_admin = require_role("admin")
require_admin_or_almacenero = require_role("admin", "almacenero")