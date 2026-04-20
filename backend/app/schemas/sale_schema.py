from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- ITEM DE VENTA (El detalle de cada producto) ---
class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int
    serial_number: Optional[str] = None  # Para el IMEI

# --- CREAR VENTA (Lo que envía el Frontend) ---
class SaleCreate(BaseModel):
    store_id: int
    payment_method: str
    
    # Cliente
    client_dni: Optional[str] = None  
    
    # Pagos (Tier 3)
    payment_reference: Optional[str] = None
    amount_received: Optional[float] = None
    
    # Campos de descuento
    discount_type: Optional[str] = None  # PERCENTAGE | FIXED_AMOUNT
    discount_value: Optional[float] = None  # Valor ingresado (% o S/)
    discount_amount: Optional[float] = None  # Monto calculado del descuento
    promotion_id: Optional[int] = None
    
    # Fidelización
    points_used: Optional[int] = 0
    points_discount_amount: Optional[float] = 0
    
    items: List[SaleItemCreate]

# --- RESPUESTA DE VENTA (Lo que devolvemos al confirmar) ---
class SaleResponse(BaseModel):
    sale_id: int
    total_amount: float
    net_amount: Optional[float] = None
    status: str
    # Datos SUNAT (disponibles tras emisión síncrona)
    sunat_status: Optional[str] = None
    invoice_type: Optional[str] = None
    invoice_series: Optional[str] = None
    invoice_number: Optional[str] = None

# --- HISTORIAL (Para la pantalla de reportes) ---
class SaleDetailHistory(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float
    serial_number: Optional[str] = None

class SaleHistoryResponse(BaseModel):
    sale_id: int
    date_created: datetime
    total_amount: float
    payment_method: str
    client_dni: Optional[str] = None
    user_name: str
    details: List[SaleDetailHistory]
    sunat_status: Optional[str] = "PENDIENTE"
    invoice_type: Optional[str] = "BOLETA"
    xml_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class VoidSaleRequest(BaseModel):
    reason: str = "Anulación de la operación"