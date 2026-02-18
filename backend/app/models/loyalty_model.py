from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=False)
    
    # Puntos ganados (+) o usados (-)
    points = Column(Integer, nullable=False) 
    
    # Tipo: 'EARN' (Acumulación), 'REDEEM' (Canje), 'ADJUST' (Ajuste Manual)
    type = Column(String(50), nullable=False)
    
    # Razón: "Compra #123", "Canje en Venta #123", "Ajuste por error"
    reason = Column(String(255), nullable=True)
    
    # Referencia a la venta (opcional, si es por compra/canje)
    sale_id = Column(Integer, ForeignKey("sales.sale_id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.now)

    # Relaciones
    client = relationship("Client", back_populates="loyalty_transactions")
    sale = relationship("Sale")
