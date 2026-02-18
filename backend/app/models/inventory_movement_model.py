from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    movement_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=True)
    
    type = Column(String(10), nullable=False) # IN / OUT
    reason = Column(String(50)) 
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2), default=0) # Importante para utilidad
    date = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    product = relationship("Product", back_populates="movements")
    user = relationship("User", back_populates="movements")
    supplier = relationship("Supplier")