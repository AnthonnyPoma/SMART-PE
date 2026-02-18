from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums para validacion
class CashStatusEnum(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

# --- OPEN ---
class CashOpenRequest(BaseModel):
    store_id: int
    start_amount: float

# --- CLOSE ---
class CashCloseRequest(BaseModel):
    final_amount_real: float
    notes: Optional[str] = None

# --- MOVEMENTS ---
class CashMovementCreate(BaseModel):
    amount: float
    type: str # EXPENSE, DEPOSIT
    description: str

class CashMovementResponse(BaseModel):
    movement_id: int
    amount: float
    type: str
    description: Optional[str]
    timestamp: datetime

    class Config:
        orm_mode = True

# --- RESPONSE ---
class RoleSummary(BaseModel):
    name: str
    class Config:
        orm_mode = True

class UserSummary(BaseModel):
    username: str
    role: Optional[RoleSummary]
    class Config:
        orm_mode = True

# --- RESPONSE ---
class CashRegisterResponse(BaseModel):
    cash_id: int
    store_id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime]
    start_amount: float
    status: str
    
    # Solo visible al cerrar o consultar status
    expected_cash: Optional[float] 
    final_amount_real: Optional[float]
    difference: Optional[float]
    notes: Optional[str]

    user: Optional[UserSummary] = None # Relación con usuario

    class Config:
        orm_mode = True

class CashStatusResponse(BaseModel):
    has_open_register: bool
    register: Optional[CashRegisterResponse] = None
    current_cash_sales: float = 0.0 # Ventas efectivo del turno
    current_balance: float = 0.0 # Saldo teorico actual
