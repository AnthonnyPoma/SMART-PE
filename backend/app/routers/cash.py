from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from datetime import datetime
from typing import Optional, List

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user_model import User
from app.models.cash_model import CashRegister, CashMovement, CashStatus, MovementType
from app.models.sale_model import Sale, SalePayment
from app.schemas.cash_schema import (
    CashOpenRequest, CashCloseRequest, CashStatusResponse, 
    CashRegisterResponse, CashMovementCreate, CashMovementResponse
)

router = APIRouter()

# -----------------
# UTILS
# -----------------
def get_active_register(db: Session, user_id: int):
    return db.query(CashRegister).filter(
        CashRegister.user_id == user_id,
        CashRegister.status == CashStatus.OPEN
    ).first()

# -----------------
# ENDPOINTS
# -----------------

@router.get("/status", response_model=CashStatusResponse)
def check_cash_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Verifica si el usuario tiene una caja abierta y retorna su estado actual."""
    register = get_active_register(db, current_user.user_id)
    
    if not register:
        return {"has_open_register": False}

    # Calcular ventas en efectivo del turno actual
    # Sumamos pagos en EFECTIVO de ventas realizadas por este usuario desde start_time
    cash_sales = db.query(func.coalesce(func.sum(SalePayment.amount), 0.0)).join(Sale).filter(
        Sale.user_id == current_user.user_id,
        Sale.date_created >= register.start_time,
        SalePayment.method == "Efectivo"
    ).scalar()

    # Calcular movimientos manuales (Ingresos - Egresos)
    movements_sum = db.query(func.coalesce(func.sum(CashMovement.amount), 0.0)).filter(
        CashMovement.cash_id == register.cash_id
    ).scalar()
    
    current_balance = register.start_amount + float(cash_sales) + float(movements_sum)

    return {
        "has_open_register": True,
        "register": register,
        "current_cash_sales": float(cash_sales),
        "current_balance": current_balance
    }

@router.post("/open", response_model=CashRegisterResponse)
def open_cash_register(
    request: CashOpenRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Abre un nuevo turno de caja."""
    # 1. Validar si ya tiene caja abierta
    if get_active_register(db, current_user.user_id):
        raise HTTPException(status_code=400, detail="Ya tienes una caja abierta.")

    # 2. Crear registro
    new_register = CashRegister(
        store_id=request.store_id,
        user_id=current_user.user_id,
        start_amount=request.start_amount,
        start_time=datetime.now(),
        status=CashStatus.OPEN
    )
    
    db.add(new_register)
    db.commit()
    db.refresh(new_register)
    
    return new_register

@router.post("/close", response_model=CashRegisterResponse)
def close_cash_register(
    request: CashCloseRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Cierra el turno actual y realiza el arqueo."""
    register = get_active_register(db, current_user.user_id)
    if not register:
        raise HTTPException(status_code=400, detail="No tienes una caja abierta para cerrar.")

    # 1. Calcular Esperado
    # Ventas efectivo
    cash_sales = db.query(func.coalesce(func.sum(SalePayment.amount), 0.0)).join(Sale).filter(
        Sale.user_id == current_user.user_id,
        Sale.date_created >= register.start_time,
        SalePayment.method == "Efectivo"
    ).scalar()
    
    # Movimientos caja
    movements_sum = db.query(func.coalesce(func.sum(CashMovement.amount), 0.0)).filter(
        CashMovement.cash_id == register.cash_id
    ).scalar()

    expected = register.start_amount + float(cash_sales) + float(movements_sum)

    # 2. Actualizar registro
    register.end_time = datetime.now()
    register.status = CashStatus.CLOSED
    register.final_amount_system = expected
    register.expected_cash = expected
    register.final_amount_real = request.final_amount_real
    register.difference = request.final_amount_real - expected
    register.notes = request.notes

    db.commit()
    db.refresh(register)
    
    return register

@router.post("/movement", response_model=CashMovementResponse)
def add_cash_movement(
    movement: CashMovementCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Registra un ingreso o egreso manual (Gastos, retiros, sencillo)."""
    register = get_active_register(db, current_user.user_id)
    if not register:
        raise HTTPException(status_code=400, detail="Debes abrir caja antes de registrar movimientos.")

    # Si es GASTO o RETIRO, el monto debe ser negativo para la suma
    final_amount = movement.amount
    if movement.type in [MovementType.EXPENSE, MovementType.WITHDRAWAL] and final_amount > 0:
        final_amount = -final_amount
    
    new_movement = CashMovement(
        cash_id=register.cash_id,
        amount=final_amount,
        type=movement.type,
        description=movement.description,
        timestamp=datetime.now()
    )
    
    db.add(new_movement)
    db.commit()
    db.refresh(new_movement)
    
    return new_movement

@router.get("/history", response_model=List[CashRegisterResponse])
def get_cash_history(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[int] = None,
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Historial de cierres de caja.
    Filtros opcionales: Rango de fechas, usuario específico.
    Solo Admin puede ver historial de todos (o implementar lógica de permisos).
    """
    # Si no es admin, forzar user_id al propio? (Opcional, segun requerimiento "Auditoria" suele ser para admins)
    # Por ahora permitimos ver todo si es admin, o solo lo suyo si es empleado (si se quisiera).
    # Asumiremos que esta vista es protegida en frontend para Admin.

    query = db.query(CashRegister).options(joinedload(CashRegister.user)).order_by(desc(CashRegister.start_time))

    # 1. Filtro Mandatorio: Solo ver cajas de MI TIENDA (Aislamiento)
    # Asumimos que el usuario solo puede auditar su propia tienda.
    # Si fuera SuperAdmin global, podríamos hacer un if role == 'superadmin'.
    # Dado el requerimiento "admin2 NO debe ver tienda 1", aplicamos filtro estricto.
    query = query.filter(CashRegister.store_id == current_user.store_id)

    if user_id:
        query = query.filter(CashRegister.user_id == user_id)
    
    if start_date:
        query = query.filter(CashRegister.start_time >= start_date)
    
    if end_date:
        query = query.filter(CashRegister.start_time <= end_date)

    registers = query.limit(limit).offset(skip).all()
    return registers
