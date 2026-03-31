from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class WebOrder(Base):
    __tablename__ = "web_orders"

    order_id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.client_id"), nullable=True)
    
    # Datos de envío / contacto
    customer_name = Column(String(150), nullable=False)
    customer_email = Column(String(150), nullable=False)
    customer_phone = Column(String(20), nullable=True)
    shipping_address = Column(String(255), nullable=True)
    
    # Totales y Estado
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default="PENDIENTE") # PENDIENTE, PAGADO, EN_PREPARACION, ENVIADO, ENTREGADO, CANCELADO
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    client = relationship("Client")
    items = relationship("WebOrderItem", back_populates="order", cascade="all, delete")

class WebOrderItem(Base):
    __tablename__ = "web_order_items"

    item_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("web_orders.order_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"))
    
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    # Relaciones
    order = relationship("WebOrder", back_populates="items")
    product = relationship("Product")
