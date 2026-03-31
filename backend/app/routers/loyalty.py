from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.client_model import Client
from app.models.loyalty_model import LoyaltyTransaction
from app.models.user_model import User
from app.dependencies import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- SCHEMAS ---
class LoyaltyTransactionResponse(BaseModel):
    transaction_id: int
    points: int
    type: str
    reason: str
    created_at: datetime
    sale_id: int | None

    class Config:
        from_attributes = True

class ClientPointsResponse(BaseModel):
    client_id: int
    current_points: int
    history: List[LoyaltyTransactionResponse]

# --- ENDPOINTS ---

@router.get("/points/{client_id}", response_model=ClientPointsResponse)
def get_client_points(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Obtener historial ordenado por fecha
    history = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.client_id == client_id
    ).order_by(LoyaltyTransaction.created_at.desc()).all()
    
    return {
        "client_id": client.client_id,
        "current_points": client.current_points or 0,
        "history": history
    }

# --- SCHEMA PARA AJUSTE MANUAL ---
class LoyaltyAdjustRequest(BaseModel):
    client_id: int
    points: int  # Positivo = bonus, Negativo = descuento
    reason: str = "Ajuste manual"

@router.post("/adjust")
def adjust_loyalty_points(
    request: LoyaltyAdjustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ajuste manual de puntos de fidelización (Solo Admin)."""
    client = db.query(Client).filter(Client.client_id == request.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Crear transacción
    tx_type = "BONUS" if request.points > 0 else "ADJUSTMENT"
    new_tx = LoyaltyTransaction(
        client_id=request.client_id,
        points=request.points,
        type=tx_type,
        reason=request.reason,
        created_at=datetime.now()
    )
    db.add(new_tx)
    
    # Actualizar saldo
    client.current_points = (client.current_points or 0) + request.points
    
    db.commit()
    
    return {
        "message": f"Ajuste de {request.points} puntos aplicado",
        "new_balance": client.current_points
    }

