from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- DETAILS ---
class PurchaseOrderDetailBase(BaseModel):
    product_id: int
    quantity: int
    unit_cost: float

class PurchaseOrderDetailCreate(PurchaseOrderDetailBase):
    pass

class PurchaseOrderDetailResponse(PurchaseOrderDetailBase):
    detail_id: int
    subtotal: float
    product_name: str

    class Config:
        orm_mode = True
        from_attributes = True

# --- ORDER ---
class PurchaseOrderBase(BaseModel):
    supplier_id: int
    expected_date: Optional[datetime] = None
    notes: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderDetailCreate]

class PurchaseOrderResponse(PurchaseOrderBase):
    po_id: int
    user_id: int
    status: str
    total_amount: float
    date_created: datetime
    supplier_name: str
    user_name: str
    details: List[PurchaseOrderDetailResponse]

    class Config:
        orm_mode = True
        from_attributes = True

# --- RECEPTION CON IMEIS ---
class ProductImeiEntry(BaseModel):
    product_id: int
    serials: List[str]

class POReceiveWithImeis(BaseModel):
    items: List[ProductImeiEntry]
