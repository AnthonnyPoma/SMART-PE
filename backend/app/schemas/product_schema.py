# app/schemas/product_schema.py
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime # Asegúrate de importar esto arriba

# --- ESQUEMAS PARA CATEGORÍAS ---
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    category_id: int
    
    class Config:
        from_attributes = True # Permite leer datos formato ORM

# --- ESQUEMAS PARA PRODUCTOS ---
class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    base_price: Decimal
    min_stock: int = 5
    category_id: int # El usuario enviará el ID de la categoría (ej: 1 para Celulares)
    is_serializable: bool = False
    image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass # Podríamos agregar validaciones extra aquí si fuera necesario

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None
    min_stock: Optional[int] = None
    category_id: Optional[int] = None
    is_serializable: Optional[bool] = None
    image_url: Optional[str] = None

class ProductResponse(ProductBase):
    product_id: int
    category: Optional[CategoryResponse] = None # Para mostrar el nombre de la categoría al responder
    stock: int = 0
    average_cost: Optional[float] = 0.0 # Necesario para el FrontEnd Margen %

    class Config:
        from_attributes = True

class StockEntry(BaseModel):
    product_id: int
    store_id: int
    quantity: int
    unit_cost: float
    serials: List[str] = []
    
    # Campos de compras
    supplier_id: int
    document_type: str   # Ej: "FACTURA", "GUIA"
    document_number: str # Ej: "F001-2345"
    notes: Optional[str] = None

class KardexResponse(BaseModel):
    movement_id: int
    date: datetime
    product_name: str
    sku: str
    type: str     # "ENTRADA" o "SALIDA"
    quantity: int
    unit_cost: Optional[float] = 0.0
    reason: Optional[str] = None
    user_name: str
    serial_number: Optional[str] = None  # IMEI individual
    serial_numbers: Optional[List[str]] = []  # Lista de IMEIs agrupados

    class Config:
        from_attributes = True

class KardexPaginatedResponse(BaseModel):
    data: List[KardexResponse]
    total_records: int
    current_page: int
    total_pages: int
    
# --- ESQUEMA PARA SERIES DE PRODUCTOS (IMEIs) ---
class ProductSeriesResponse(BaseModel):
    series_id: int
    serial_number: str
    status: str
    product_id: int
    
    class Config:
        from_attributes = True
