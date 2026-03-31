from fastapi import APIRouter, HTTPException, Depends
from app.dependencies import get_current_user
from app.models.user_model import User
from app.services import external_api_service

router = APIRouter()

@router.get("/dni/{dni}")
async def get_dni_info(dni: str, current_user: User = Depends(get_current_user)):
    """ Endpoint expuesto al frontend para consultar DNI """
    try:
        data = await external_api_service.consultar_dni(dni)
        return data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el servidor: {str(e)}")

@router.get("/ruc/{ruc}")
async def get_ruc_info(ruc: str, current_user: User = Depends(get_current_user)):
    """ Endpoint expuesto al frontend para consultar RUC """
    try:
        data = await external_api_service.consultar_ruc(ruc)
        return data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el servidor: {str(e)}")
