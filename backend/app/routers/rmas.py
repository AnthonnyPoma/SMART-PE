from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.user_model import User
from app.models.product_model import Product, Inventory
from app.models.rma_model import RMATicket
from app.models.inventory_movement_model import InventoryMovement
from app.schemas.rma_schema import RMACreate, RMAResponse, RMAUpdate
from app.dependencies import get_current_user

router = APIRouter()

@router.post("/", response_model=RMAResponse)
def create_rma(
    rma: RMACreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify product
    product = db.query(Product).filter(Product.product_id == rma.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    new_rma = RMATicket(
        sale_id=rma.sale_id,
        product_id=rma.product_id,
        serial_number=rma.serial_number,
        store_id=rma.store_id,
        user_id=current_user.user_id,
        issue_description=rma.issue_description,
        status="PENDING"
    )
    db.add(new_rma)
    db.commit()
    db.refresh(new_rma)
    
    # We populate extra fields for the response
    res = RMAResponse.model_validate(new_rma)
    res.product_name = product.name
    res.user_name = current_user.full_name or current_user.username
    return res

@router.get("/", response_model=List[RMAResponse])
def get_rmas(
    store_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(RMATicket)
    if store_id:
        query = query.filter(RMATicket.store_id == store_id)
    
    rmas = query.order_by(RMATicket.created_at.desc()).all()
    
    out = []
    for r in rmas:
        item = RMAResponse.model_validate(r)
        item.product_name = r.product.name if r.product else "Unknown"
        item.user_name = r.user.full_name or r.user.username if r.user else "Unknown"
        out.append(item)
    return out

@router.put("/{rma_id}", response_model=RMAResponse)
def update_rma_status(
    rma_id: int,
    rma_update: RMAUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rma = db.query(RMATicket).filter(RMATicket.rma_id == rma_id).first()
    if not rma:
        raise HTTPException(status_code=404, detail="RMA no encontrado")
        
    rma.status = rma_update.status
    if rma_update.resolution_notes:
        rma.resolution_notes = rma_update.resolution_notes
        
    if rma_update.status in ["REPLACED", "REFUNDED", "REJECTED"]:
        rma.resolved_at = datetime.now()
        
        # Integración con inventario/Kardex (solo productos físicos con cambio de estado)
        if rma_update.status == "REPLACED" and rma.status != "REPLACED":
            # Descontar 1 unidad del inventario local (El nuevo dado al cliente)
            inv = db.query(Inventory).filter(
                Inventory.product_id == rma.product_id,
                Inventory.store_id == rma.store_id
            ).first()
            
            if inv:
                inv.quantity -= 1
                
                # Registrar movimiento en Kardex
                mov = InventoryMovement(
                    product_id=rma.product_id,
                    store_id=rma.store_id,
                    movement_type="OUT",
                    quantity=1,
                    reason="RMA_REPLACEMENT",
                    reference_id=f"RMA-{rma.rma_id}",
                    user_id=current_user.user_id,
                    created_at=datetime.now()
                )
                db.add(mov)
        
    db.commit()
    db.refresh(rma)
    
    res = RMAResponse.model_validate(rma)
    res.product_name = rma.product.name if rma.product else "Unknown"
    res.user_name = rma.user.full_name or rma.user.username if rma.user else "Unknown"
    return res
