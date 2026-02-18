from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import enum

class CashStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class MovementType(str, enum.Enum):
    SALE = "SALE"         # Venta automática
    EXPENSE = "EXPENSE"   # Gasto manual (ej. pago luz)
    DEPOSIT = "DEPOSIT"   # Ingreso manual (ej. sencillo extra)
    WITHDRAWAL = "WITHDRAWAL" # Retiro manual

class CashRegister(Base):
    __tablename__ = "cash_registers"

    cash_id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.store_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    
    start_time = Column(DateTime, default=datetime.now)
    end_time = Column(DateTime, nullable=True)
    
    start_amount = Column(Float, default=0.0) # Monto apertura
    
    # Valores calculados por sistema al cierre
    final_amount_system = Column(Float, default=0.0) 
    expected_cash = Column(Float, default=0.0) # start_amount + cash_sales - expenses
    
    # Valores ingresados por usuario al cierre (Arqueo)
    final_amount_real = Column(Float, nullable=True) 
    difference = Column(Float, default=0.0)
    
    status = Column(String, default=CashStatus.OPEN) # Enum persistido como string
    notes = Column(String, nullable=True)

    # Relaciones
    user = relationship("User")
    store = relationship("Store")
    movements = relationship("CashMovement", back_populates="register")

class CashMovement(Base):
    __tablename__ = "cash_movements"

    movement_id = Column(Integer, primary_key=True, index=True)
    cash_id = Column(Integer, ForeignKey("cash_registers.cash_id"), nullable=False)
    
    amount = Column(Float, nullable=False) # Positivo para ingreso, negativo para egreso
    type = Column(String, nullable=False) # SALE, EXPENSE, etc.
    description = Column(String, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.now)
    
    related_sale_id = Column(Integer, ForeignKey("sales.sale_id"), nullable=True)

    register = relationship("CashRegister", back_populates="movements")
