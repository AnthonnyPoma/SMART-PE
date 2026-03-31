from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class RMATicket(Base):
    """
    Modelo para la gestión de Garantías / Return Merchandise Authorization (RMA).
    """
    __tablename__ = "rma_tickets"

    rma_id = Column(Integer, primary_key=True, index=True)
    
    # Origen del problema
    sale_id = Column(Integer, ForeignKey("sales.sale_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    serial_number = Column(String(100), nullable=True)  # El IMEI que falló
    
    # Tienda donde se reporta
    store_id = Column(Integer, ForeignKey("stores.store_id"), nullable=False)
    
    # Quien lo registra
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    # Detalles técnicos
    issue_description = Column(Text, nullable=False)
    # PENDING, IN_REPAIR, REPLACED, REFUNDED, REJECTED
    status = Column(String(50), default="PENDING") 
    resolution_notes = Column(Text, nullable=True)
    
    # Tiempos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    sale = relationship("Sale")
    product = relationship("Product")
    store = relationship("Store")
    user = relationship("User")
