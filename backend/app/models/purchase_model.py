from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Purchase(Base):
    __tablename__ = "purchases"

    purchase_id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False) # Quién registró el ingreso
    
    document_type = Column(String) # Ej: "FACTURA", "GUIA"
    document_number = Column(String) # Ej: "F001-456"
    
    total_amount = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    
    date_created = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    supplier = relationship("Supplier")
    user = relationship("User")
    details = relationship("PurchaseDetail", back_populates="purchase")

class PurchaseDetail(Base):
    __tablename__ = "purchase_details"

    detail_id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.purchase_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"))
    
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False) # Costo unitario al momento de la compra
    subtotal = Column(Float, nullable=False)

    purchase = relationship("Purchase", back_populates="details")
    product = relationship("Product")