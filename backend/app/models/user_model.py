from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    
    # Perfil Completo
    full_name = Column(String)
    dni = Column(String, unique=True, index=True)
    email = Column(String, unique=True, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    supervisor_pin = Column(String(6), nullable=True)  # PIN para autorizar descuentos
    
    # Datos del Sistema
    role_id = Column(Integer, ForeignKey("roles.role_id"))
    store_id = Column(Integer, ForeignKey("stores.store_id"))

    # Relaciones
    role = relationship("Role") 
    store = relationship("Store", back_populates="users")
    
    # 👇 ESTA ES LA LÍNEA QUE FALTA PARA EL KARDEX 👇
    movements = relationship("InventoryMovement", back_populates="user")