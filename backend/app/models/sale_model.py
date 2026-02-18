from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Sale(Base):
    __tablename__ = "sales"

    sale_id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=True) # Nuevo
    
    total_amount = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0)  # Monto descontado
    net_amount = Column(Numeric(10, 2), nullable=True)  # Total después del descuento
    promotion_id = Column(Integer, ForeignKey("promotions.promotion_id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)  # Supervisor que aprobó
    date_created = Column(DateTime(timezone=True), server_default=func.now())

    # Campos SUNAT (Facturación Electrónica)
    invoice_type = Column(String(10), default='BOLETA')
    invoice_series = Column(String(10))
    invoice_number = Column(String(20))
    sunat_status = Column(String(20), default='PENDIENTE')
    hash_cpe = Column(String(255))
    xml_url = Column(Text)
    
    # Notas de Crédito
    related_sale_id = Column(Integer, ForeignKey("sales.sale_id"), nullable=True)
    credit_note_reason = Column(String(200), nullable=True)

    # Puntos
    points_earned = Column(Integer, default=0)
    points_used = Column(Integer, default=0)

    # Relaciones
    store = relationship("Store", back_populates="sales")
    client = relationship("Client", back_populates="sales")
    details = relationship("SaleDetail", back_populates="sale")
    payments = relationship("SalePayment", back_populates="sale")
    user = relationship("User", foreign_keys=[user_id])  # Vendedor
    approver = relationship("User", foreign_keys=[approved_by])  # Supervisor que aprobó

class SaleDetail(Base):
    __tablename__ = "sale_details"

    detail_id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.sale_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"))
    series_id = Column(Integer, ForeignKey("product_series.series_id"), nullable=True)
    
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(10, 2))
    subtotal = Column(Numeric(10, 2))
    promotion_id = Column(Integer, nullable=True) # Para promociones futuras

    sale = relationship("Sale", back_populates="details")
    product = relationship("Product")

class SalePayment(Base): # Nueva tabla de pagos
    __tablename__ = "sale_payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.sale_id"))
    method = Column(String(50), nullable=False) # EFECTIVO, YAPE, TARJETA
    amount = Column(Numeric(10, 2), nullable=False)
    reference_code = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sale = relationship("Sale", back_populates="payments")