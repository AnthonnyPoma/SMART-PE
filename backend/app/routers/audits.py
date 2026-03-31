from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.user_model import User
from app.models.product_model import Product, Inventory, ProductSeries
from sqlalchemy import func
from app.models.audit_model import InventoryAudit, AuditItem
from app.schemas.audit_schema import AuditCreate, AuditResponse, AuditCloseRequest, AuditItemResponse
from app.dependencies import get_current_user
from fastapi.responses import StreamingResponse
from app.utils.pdf_generator import generate_audit_pdf

router = APIRouter()

@router.post("/start", response_model=AuditResponse)
def start_audit(
    request: AuditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check for active audits
    active_audit = db.query(InventoryAudit).filter(
        InventoryAudit.store_id == request.store_id,
        InventoryAudit.status == "OPEN"
    ).first()
    
    if active_audit:
        raise HTTPException(status_code=400, detail="Ya existe una auditoría abierta para esta tienda.")
        
    audit = InventoryAudit(
        store_id=request.store_id,
        user_id=current_user.user_id,
        notes=request.notes
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit

@router.get("/open", response_model=AuditResponse)
def get_open_audit(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    audit = db.query(InventoryAudit).filter(
        InventoryAudit.store_id == store_id,
        InventoryAudit.status == "OPEN"
    ).first()
    if not audit:
        raise HTTPException(status_code=404, detail="No hay auditorías abiertas.")
    return audit
    
@router.get("/history", response_model=List[AuditResponse])
def get_audit_history(
    store_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    audits = db.query(InventoryAudit).filter(
        InventoryAudit.store_id == store_id,
        InventoryAudit.status == "CLOSED"
    ).order_by(InventoryAudit.end_date.desc()).all()
    return audits

@router.post("/{audit_id}/close", response_model=AuditResponse)
def close_audit(
    audit_id: int,
    request: AuditCloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    audit = db.query(InventoryAudit).filter(InventoryAudit.audit_id == audit_id).first()
    if not audit or audit.status != "OPEN":
        raise HTTPException(status_code=400, detail="Auditoría no encontrada o ya cerrada.")
        
    # Validar PIN supervisor
    supervisor = db.query(User).filter(
        User.supervisor_pin == request.supervisor_pin,
        User.role_id.in_([1, 2])
    ).first()
    if not supervisor:
        raise HTTPException(status_code=403, detail="PIN de supervisor inválido.")

    # Convertir list request a dict para facil acceso
    counted_map = {item.product_id: item.counted_quantity for item in request.items}
    
    # Obtener stock actual real de AMBOS TIPOS (General y Seriado)
    products = db.query(Product).all()
    expected_map = {}
    
    for product in products:
        if product.is_serializable:
            count = db.query(ProductSeries).filter(
                ProductSeries.product_id == product.product_id,
                ProductSeries.status == 'disponible',
                ProductSeries.store_id == audit.store_id
            ).count()
        else:
            total_quantity = db.query(func.sum(Inventory.quantity)).filter(
                Inventory.product_id == product.product_id,
                Inventory.store_id == audit.store_id
            ).scalar()
            count = total_quantity if total_quantity else 0
            
        if count > 0:
            expected_map[product.product_id] = count

    all_involved_product_ids = set(expected_map.keys()).union(set(counted_map.keys()))
    
    for p_id in all_involved_product_ids:
        expected = expected_map.get(p_id, 0)
        counted = counted_map.get(p_id, 0)
        
        audit_item = AuditItem(
            audit_id=audit.audit_id,
            product_id=p_id,
            expected_quantity=expected,
            counted_quantity=counted
        )
        db.add(audit_item)

    audit.status = "CLOSED"
    audit.end_date = datetime.now()
    audit.notes = request.notes or audit.notes
    db.commit()
    db.refresh(audit)
    
    items_response = []
    for item in audit.items:
        diff = item.counted_quantity - item.expected_quantity
        items_response.append(AuditItemResponse(
            product_id=item.product_id,
            product_name=item.product.name,
            expected_quantity=item.expected_quantity,
            counted_quantity=item.counted_quantity,
            difference=diff
        ))
        
    return AuditResponse(
        audit_id=audit.audit_id,
        store_id=audit.store_id,
        user_id=audit.user_id,
        start_date=audit.start_date,
        end_date=audit.end_date,
        status=audit.status,
        notes=audit.notes,
        items=items_response
    )

@router.get("/{audit_id}/pdf", response_class=StreamingResponse)
def get_audit_pdf(audit_id: int, db: Session = Depends(get_db)):
    """Generate and download a PDF of the specific Audit Report"""
    audit = db.query(InventoryAudit).filter(InventoryAudit.audit_id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Auditoría no encontrada")
        
    items = db.query(AuditItem).filter(AuditItem.audit_id == audit_id).all()
    
    audit_data = {
        "audit_id": audit.audit_id,
        "store_id": audit.store_id,
        "user_id": audit.user_id,
        "end_date": audit.end_date,
        "items": []
    }
    
    for item in items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        audit_data["items"].append({
            "product_id": item.product_id,
            "product_name": product.name if product else f"ID {item.product_id}",
            "expected_quantity": item.expected_quantity,
            "counted_quantity": item.counted_quantity,
            "difference": item.counted_quantity - item.expected_quantity
        })
        
    pdf_buffer = generate_audit_pdf(audit_data)
    
    headers = {
        'Content-Disposition': f'attachment; filename="auditoria_{audit_id}.pdf"'
    }
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers=headers
    )
