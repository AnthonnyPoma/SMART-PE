from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

# Importar modelos explícitamente para evitar problemas con ForwardRef y Pydantic
from app.models.store_model import Store
from app.models.user_model import User

class Transfer(Base):
    __tablename__ = "transfers"

    transfer_id = Column(Integer, primary_key=True, index=True)
    
    source_store_id = Column(Integer, ForeignKey("stores.store_id"), nullable=False)
    target_store_id = Column(Integer, ForeignKey("stores.store_id"), nullable=False)
    
    status = Column(String, default="PENDIENTE") # PENDIENTE, EN_TRANSITO, RECIBIDO, RECHAZADO
    
    user_request_id = Column(Integer, ForeignKey("users.user_id"))
    user_dispatch_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    user_receive_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    date_requested = Column(DateTime, default=datetime.now)
    date_dispatched = Column(DateTime, nullable=True)
    date_received = Column(DateTime, nullable=True)
    
    notes = Column(Text, nullable=True)

    # Relaciones (Usando clases explícitas)
    source_store = relationship(Store, foreign_keys=[source_store_id])
    target_store = relationship(Store, foreign_keys=[target_store_id])
    
    user_request = relationship(User, foreign_keys=[user_request_id])
    
    details = relationship("TransferDetail", back_populates="transfer")


class TransferDetail(Base):
    __tablename__ = "transfer_details"

    detail_id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.transfer_id"))
    
    product_id = Column(Integer, ForeignKey("products.product_id"))
    series_id = Column(Integer, ForeignKey("product_series.series_id"), nullable=True) # Para IMEI específico
    
    quantity = Column(Integer, default=1)

    transfer = relationship("Transfer", back_populates="details")
    product = relationship("Product")
    series = relationship("ProductSeries")
