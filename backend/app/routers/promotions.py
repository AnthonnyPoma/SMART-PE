from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.promotion_model import Promotion
from app.models.user_model import User


router = APIRouter()


# ==========================================
# 📦 SCHEMAS
# ==========================================
class PromotionCreate(BaseModel):
    name: str
    code: Optional[str] = None
    discount_type: str  # PERCENTAGE | FIXED_AMOUNT
    value: float
    min_purchase: Optional[float] = None
    max_discount: Optional[float] = None
    requires_approval: bool = False
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None


class PromotionResponse(BaseModel):
    promotion_id: int
    name: str
    code: Optional[str]
    discount_type: str
    value: float
    min_purchase: Optional[float]
    max_discount: Optional[float]
    requires_approval: bool
    is_active: bool

    class Config:
        from_attributes = True


class DiscountRequest(BaseModel):
    """Solicitud para calcular/aplicar descuento"""
    discount_type: str  # PERCENTAGE | FIXED_AMOUNT
    value: float
    subtotal: float
    supervisor_pin: Optional[str] = None


class DiscountResponse(BaseModel):
    """Resultado del cálculo de descuento"""
    original_amount: float
    discount_amount: float
    net_amount: float
    requires_approval: bool
    approved: bool


# ==========================================
# 🎯 ENDPOINTS
# ==========================================
@router.get("/", response_model=List[PromotionResponse])
def get_promotions(db: Session = Depends(get_db)):
    """Obtener todas las promociones activas"""
    promotions = db.query(Promotion).filter(Promotion.is_active == True).all()
    return promotions


@router.post("/", response_model=PromotionResponse)
def create_promotion(
    promo: PromotionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crear una nueva promoción (Solo Admin)"""
    # Verificar rol (simplificado - en producción validar rol_id)
    if current_user.role_id not in [1, 2]:  # Admin o Gerente
        raise HTTPException(status_code=403, detail="No tienes permisos para crear promociones")
    
    new_promo = Promotion(
        name=promo.name,
        code=promo.code,
        discount_type=promo.discount_type,
        value=promo.value,
        min_purchase=promo.min_purchase,
        max_discount=promo.max_discount,
        requires_approval=promo.requires_approval,
        valid_from=promo.valid_from,
        valid_until=promo.valid_until,
        created_by=current_user.user_id
    )
    db.add(new_promo)
    db.commit()
    db.refresh(new_promo)
    return new_promo


@router.post("/calculate", response_model=DiscountResponse)
def calculate_discount(
    request: DiscountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calcular descuento sin guardar.
    Usado por el POS para mostrar el total actualizado antes de cobrar.
    """
    subtotal = request.subtotal
    discount_value = request.value
    discount_type = request.discount_type
    
    # Calcular monto del descuento
    if discount_type == "PERCENTAGE":
        discount_amount = subtotal * (discount_value / 100)
    else:  # FIXED_AMOUNT
        discount_amount = discount_value
    
    # Validar que el descuento no sea mayor al subtotal
    if discount_amount > subtotal:
        discount_amount = subtotal
    
    net_amount = subtotal - discount_amount
    
    # Determinar si requiere aprobación (> 15%)
    discount_percentage = (discount_amount / subtotal * 100) if subtotal > 0 else 0
    requires_approval = discount_percentage > 15
    
    # Validar PIN de supervisor si es requerido
    approved = True
    if requires_approval:
        if not request.supervisor_pin:
            approved = False
        else:
            # Buscar supervisor con ese PIN
            supervisor = db.query(User).filter(
                User.supervisor_pin == request.supervisor_pin,
                User.role_id.in_([1, 2])  # Admin o Gerente
            ).first()
            approved = supervisor is not None
    
    return DiscountResponse(
        original_amount=round(subtotal, 2),
        discount_amount=round(discount_amount, 2),
        net_amount=round(net_amount, 2),
        requires_approval=requires_approval,
        approved=approved
    )


@router.delete("/{promotion_id}")
def deactivate_promotion(
    promotion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Desactivar una promoción"""
    promo = db.query(Promotion).filter(Promotion.promotion_id == promotion_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoción no encontrada")
    
    promo.is_active = False
    db.commit()
    return {"message": "Promoción desactivada"}
