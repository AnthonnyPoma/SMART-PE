from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.client_model import Client
from pydantic import BaseModel
from typing import Optional
from app.services.reniec_service import get_person_from_reniec

router = APIRouter()

class ClientBase(BaseModel):
    document_type: str = "DNI"
    document_number: str
    first_name: str
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    pass

@router.get("/search/{dni}")
def search_client_reniec(dni: str, db: Session = Depends(get_db)):
    # 1. Buscar en BD Local (Usando document_number)
    local_client = db.query(Client).filter(Client.document_number == dni).first()
    
    if local_client:
        # Concatenamos nombre y apellido para el frontend
        full_name_db = f"{local_client.first_name} {local_client.last_name or ''}".strip()
        return {
            "source": "LOCAL",
            "full_name": full_name_db,
            "client_id": local_client.client_id,
            "points": local_client.current_points
        }

    # 2. Si no existe, Buscar en RENIEC
    reniec_data = get_person_from_reniec(dni)
    if reniec_data:
        # Unimos nombres + apellidos del mock
        full_name_reniec = f"{reniec_data['nombres']} {reniec_data['apellidoPaterno']} {reniec_data['apellidoMaterno']}".strip()
        return {
            "source": "RENIEC",
            "full_name": full_name_reniec,
            "client_id": None,
            "points": 0
        }

    raise HTTPException(status_code=404, detail="DNI no encontrado")

@router.get("/", response_model=list[dict])
def read_clients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    clients = db.query(Client).offset(skip).limit(limit).all()
    # Mapeamos a dict para asegurar compatibilidad si Pydantic estricto falla
    return [
        {
            "client_id": c.client_id,
            "document_type": c.document_type,
            "document_number": c.document_number,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "address": c.address,
            "current_points": c.current_points
        }
        for c in clients
    ]

@router.post("/", response_model=dict)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    # Verificar si ya existe (Usando document_number)
    exists = db.query(Client).filter(Client.document_number == client.document_number).first()
    if exists:
         return {"client_id": exists.client_id, "message": "Cliente ya existía"}

    new_client = Client(
        document_number=client.document_number,
        document_type=client.document_type,
        first_name=client.first_name,
        last_name=client.last_name,
        email=client.email,
        phone=client.phone,
        address=client.address,
        current_points=0
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return {"client_id": new_client.client_id, "message": "Cliente registrado"}

@router.put("/{client_id}", response_model=dict)
def update_client(client_id: int, client_data: ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.client_id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    client.document_number = client_data.document_number
    client.document_type = client_data.document_type
    client.first_name = client_data.first_name
    client.last_name = client_data.last_name
    client.email = client_data.email
    client.phone = client_data.phone
    client.address = client_data.address
    
    db.commit()
    return {"message": "Cliente actualizado correctamente"}