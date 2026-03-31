from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Client(Base):
    __tablename__ = "clients"

    client_id = Column(Integer, primary_key=True, index=True)
    document_type = Column(String, default="DNI")
    # ✅ USAMOS TU CAMPO REAL
    document_number = Column(String, unique=True, index=True) 
    
    first_name = Column(String)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    accepts_marketing = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # ✅ ESTE SÍ LO NECESITAMOS (Verifica que esté en tu BD, si no, agrégalo)
    current_points = Column(Integer, default=0)

    # Relación inversa (opcional, si tienes Sale importado)
    sales = relationship("Sale", back_populates="client")
    
    # Historial de Puntos
    loyalty_transactions = relationship("LoyaltyTransaction", back_populates="client")