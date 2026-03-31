from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict
from app.core.database import get_db
from app.models.setting_model import Setting
from app.dependencies import get_current_user
from app.models.user_model import User
from pydantic import BaseModel

router = APIRouter()

# Valores por defecto si no existen en BD
DEFAULT_SETTINGS = {
    "company_name": "SMART PE",
    "company_ruc": "",
    "company_address": "",
    "company_phone": "",
    "ticket_footer": "¡Gracias por su compra!",
}

class SettingUpdate(BaseModel):
    key: str
    value: str

class SettingsBulkUpdate(BaseModel):
    settings: List[SettingUpdate]


@router.get("/")
def get_all_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Retorna todos los settings como diccionario key-value."""
    db_settings = db.query(Setting).all()
    result = dict(DEFAULT_SETTINGS)  # Empezar con defaults
    for s in db_settings:
        result[s.key] = s.value
    return result


@router.put("/")
def update_settings(
    data: SettingsBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza múltiples settings a la vez. Solo admins."""
    if current_user.role.name not in ["admin", "superadmin"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Solo administradores pueden modificar la configuración")
    
    for item in data.settings:
        existing = db.query(Setting).filter(Setting.key == item.key).first()
        if existing:
            existing.value = item.value
        else:
            new_setting = Setting(key=item.key, value=item.value)
            db.add(new_setting)
    
    db.commit()
    return {"message": "Configuración actualizada correctamente"}
