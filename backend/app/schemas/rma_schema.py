from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RMACreate(BaseModel):
    sale_id: int
    product_id: int
    serial_number: Optional[str] = None
    store_id: int
    issue_description: str

class RMAResponse(BaseModel):
    rma_id: int
    sale_id: int
    product_id: int
    serial_number: Optional[str]
    store_id: int
    user_id: int
    issue_description: str
    status: str
    resolution_notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    resolved_at: Optional[datetime]
    
    # Extra fields for frontend
    product_name: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class RMAUpdate(BaseModel):
    status: str  # PENDING, IN_REPAIR, REPLACED, REFUNDED, REJECTED
    resolution_notes: Optional[str] = None
