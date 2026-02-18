from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class Store(Base):
    __tablename__ = "stores"

    store_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String)
    
    # Campos que ya tenías y los nuevos que agregamos
    city = Column(String, nullable=True)
    status = Column(Boolean, default=True) 
    phone = Column(String, nullable=True)
    ruc = Column(String, nullable=True)

    # Sin estas líneas, el error "no property users" seguirá saliendo.
    users = relationship("User", back_populates="store")
    sales = relationship("Sale", back_populates="store")