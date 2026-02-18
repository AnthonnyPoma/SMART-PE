from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Promotion(Base):
    """
    Modelo de Promociones/Descuentos.
    Tipos soportados:
    - PERCENTAGE: Descuento porcentual (ej: 10 = 10%)
    - FIXED_AMOUNT: Monto fijo (ej: 20 = S/ 20.00)
    """
    __tablename__ = "promotions"

    promotion_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # "Descuento Gerencial", "Promo Verano"
    code = Column(String(20), unique=True, nullable=True)  # Código promocional opcional
    
    # Tipo y valor del descuento
    discount_type = Column(String(20), nullable=False)  # PERCENTAGE | FIXED_AMOUNT
    value = Column(Numeric(10, 2), nullable=False)  # 10.00 (%) o 20.00 (S/)
    
    # Restricciones
    min_purchase = Column(Numeric(10, 2), nullable=True)  # Compra mínima requerida
    max_discount = Column(Numeric(10, 2), nullable=True)  # Tope máximo de descuento
    requires_approval = Column(Boolean, default=False)  # Requiere PIN de supervisor
    
    # Vigencia
    is_active = Column(Boolean, default=True)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, nullable=True)  # user_id del creador
