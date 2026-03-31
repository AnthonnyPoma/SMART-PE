from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AuditItemCreate(BaseModel):
    product_id: int
    counted_quantity: int
    
class AuditItemResponse(BaseModel):
    product_id: int
    product_name: str
    expected_quantity: int
    counted_quantity: int
    difference: int
    
class AuditCreate(BaseModel):
    store_id: int
    notes: Optional[str] = None

class AuditResponse(BaseModel):
    audit_id: int
    store_id: int
    user_id: int
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    items: List[AuditItemResponse] = []

    class Config:
        from_attributes = True

class AuditCloseRequest(BaseModel):
    items: List[AuditItemCreate]
    supervisor_pin: str
    notes: Optional[str] = None
