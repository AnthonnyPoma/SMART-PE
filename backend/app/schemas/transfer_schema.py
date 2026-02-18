from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- DETALLES ---
class TransferItemBase(BaseModel):
    product_id: int
    quantity: int
    series_id: Optional[int] = None  # Si es serializado
    serial_number: Optional[str] = None  # Alternativa: enviar el serial en lugar del ID

class TransferItemCreate(TransferItemBase):
    pass

class TransferItemResponse(TransferItemBase):
    detail_id: int
    product_name: str
    serial_number: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- CABECERA ---
class TransferCreate(BaseModel):
    source_store_id: int
    target_store_id: int
    notes: Optional[str] = None
    items: List[TransferItemCreate]

class TransferResponse(BaseModel):
    transfer_id: int
    source_store_id: int
    target_store_id: int
    source_store_name: str
    target_store_name: str
    
    status: str
    
    user_request_name: str
    date_requested: datetime
    date_dispatched: Optional[datetime] = None
    date_received: Optional[datetime] = None
    
    items: List[TransferItemResponse] = []
    
    class Config:
        from_attributes = True
