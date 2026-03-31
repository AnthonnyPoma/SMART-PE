from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class InventoryAudit(Base):
    __tablename__ = "inventory_audits"

    audit_id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.store_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)  # Quién inició la auditoría
    
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String(20), default="OPEN")  # OPEN, CLOSED, DISCARDED
    notes = Column(Text, nullable=True)

    # Relaciones
    store = relationship("Store")
    user = relationship("User")
    items = relationship("AuditItem", back_populates="audit", cascade="all, delete-orphan")


class AuditItem(Base):
    """
    Cada iteración de escaneo o resumen por producto escaneado.
    """
    __tablename__ = "audit_items"

    audit_item_id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("inventory_audits.audit_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    
    # Cantidad que el sistema CREÍA que había al momento de iniciar la auditoría
    expected_quantity = Column(Integer, nullable=False, default=0) 
    
    # Cantidad que el operario FINALMENTE contó
    counted_quantity = Column(Integer, nullable=False, default=0)

    # Relaciones
    audit = relationship("InventoryAudit", back_populates="items")
    product = relationship("Product")
