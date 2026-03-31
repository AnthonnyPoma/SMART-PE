from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user_model import User
from app.models.sale_model import Sale
from app.dependencies import get_current_user

router = APIRouter()

class CommissionResponse(BaseModel):
    user_id: int
    full_name: str
    username: str
    monthly_goal: float
    commission_rate: float
    net_sales_month: float
    commission_earned: float
    progress_percentage: float

@router.get("/commissions", response_model=List[CommissionResponse])
def get_commissions(
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna el progreso de ventas y comisiones del mes actual.
    Para el administrador (role_id=1), muestra a todos los cajeros de la tienda.
    Para un vendedor/cajero, solo le muestra su propio avance.
    Admins pueden pasar store_id para ver otra tienda.
    """
    now = datetime.now()
    current_year = now.year
    current_month = now.month

    # Determinar si es Administrador (Ejemplo: role_id == 1 es Admin General, o Gerente de tienda)
    is_admin = current_user.role_id == 1
    effective_store_id = store_id if store_id is not None else current_user.store_id

    query = db.query(User).filter(User.store_id == effective_store_id, User.is_active == True)
    
    if not is_admin:
        query = query.filter(User.user_id == current_user.user_id)
        
    users = query.all()
    results = []
    
    for user in users:
        # Sumatoria de las ventas netas del usuario en este mes (solo ventas exitosas, excluyendo NC)
        sales_total = db.query(func.sum(Sale.net_amount)).filter(
            Sale.user_id == user.user_id,
            extract('year', Sale.date_created) == current_year,
            extract('month', Sale.date_created) == current_month,
            Sale.invoice_type != 'NC',
            Sale.sunat_status != 'RECHAZADO' 
        ).scalar() or 0.0
        
        # Las tasas se guardan o envían idealmente como porcentaje neto (ej 2.0 = 2%)
        # Para operar, dividimos entre 100 si es mayor a 1, si es 0.02 lo usamos directo
        rate = user.commission_rate or 0.0
        operable_rate = rate / 100.0 if rate > 1 else rate
        
        commission_earned = float(sales_total) * operable_rate
        
        goal = user.monthly_goal or 0.0
        progress = 0.0
        if goal > 0:
            progress = (float(sales_total) / float(goal)) * 100.0
            
        results.append(CommissionResponse(
            user_id=user.user_id,
            full_name=user.full_name or user.username,
            username=user.username,
            monthly_goal=goal,
            commission_rate=rate, 
            net_sales_month=float(sales_total),
            commission_earned=commission_earned,
            progress_percentage=min(progress, 100.0) # Cap visual opcional
        ))
        
    return results
