from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.supplier_model import Supplier
from app.models.user_model import User
from app.dependencies import get_current_user
from app.schemas.supplier_schema import SupplierCreate, SupplierResponse

router = APIRouter()

# 1. LISTAR PROVEEDORES
@router.get("/", response_model=List[SupplierResponse])
def read_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Supplier).offset(skip).limit(limit).all()

# 2. CREAR PROVEEDOR
@router.post("/", response_model=SupplierResponse)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if supplier.ruc:
        exists = db.query(Supplier).filter(Supplier.ruc == supplier.ruc).first()
        if exists:
            raise HTTPException(status_code=400, detail="Ya existe un proveedor con este RUC")
    
    new_supplier = Supplier(**supplier.dict())
    db.add(new_supplier)
    db.commit()
    db.refresh(new_supplier)
    return new_supplier

# 3. EDITAR PROVEEDOR
@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, supplier: SupplierCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_supplier = db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    for key, value in supplier.dict().items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier