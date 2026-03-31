from fastapi import HTTPException
import httpx
import logging

logger = logging.getLogger(__name__)

async def consultar_dni(dni: str) -> dict:
    """
    MOCK: Simula la consulta a una API de RENIEC para obtener datos por DNI.
    En producción, descomentar el fetch real y usar el Token de APIPeru/Nubefact.
    """
    if len(dni) != 8 or not dni.isdigit():
        raise HTTPException(status_code=400, detail="DNI inválido. Debe tener 8 dígitos numéricos.")

    # MOCK RESPONSE (Simula lo que retornaría una API real)
    # Ejemplo si dni empieza con 1, simulamos Juan Perez, etc.
    nombres_mock = {
        "1": "JUAN CARLOS",
        "4": "MARIA ELENA",
        "7": "LUIS MIGUEL"
    }
    apellidos_mock = {
        "1": "PEREZ GOMEZ",
        "4": "SALAZAR ROJAS",
        "7": "TORRES VARGAS"
    }
    
    primer_digito = dni[0]
    nombre = nombres_mock.get(primer_digito, "CLIENTE REGULAR")
    apellido = apellidos_mock.get(primer_digito, "DE PRUEBA MOCK")

    return {
        "success": True,
        "dni": dni,
        "nombre_completo": f"{apellido}, {nombre}",
        "nombres": nombre,
        "apellido_paterno": apellido.split()[0],
        "apellido_materno": apellido.split()[1] if len(apellido.split()) > 1 else "",
        "direccion": "AV. SIMULADA 123", # API Peru a veces no da dirección para DNI, es referencial
        "fuente": "MOCK_RENIEC"
    }

    # === LOGICA DE PRODUCCION (EJEMPLO CON APIPERU.DEV) ===
    # token = "TU_TOKEN_AQUI"
    # url = f"https://apiperu.dev/api/dni/{dni}?api_token={token}"
    # async with httpx.AsyncClient() as client:
    #     try:
    #         response = await client.get(url)
    #         if response.status_code == 200:
    #             data = response.json()
    #             if data.get("success"):
    #                 return data.get("data")
    #             raise HTTPException(status_code=404, detail="DNI no encontrado en padrón.")
    #         else:
    #             raise HTTPException(status_code=500, detail="Error de proveedor de DNI")
    #     except Exception as e:
    #         raise HTTPException(status_code=500, detail=str(e))

async def consultar_ruc(ruc: str) -> dict:
    """
    MOCK: Simula la consulta a SUNAT para obtener datos por RUC.
    """
    if len(ruc) != 11 or not ruc.isdigit():
        raise HTTPException(status_code=400, detail="RUC inválido. Debe tener 11 dígitos numéricos.")

    # MOCK RESPONSE
    return {
        "success": True,
        "ruc": ruc,
        "razon_social": f"EMPRESA DEMO SAC (MOCK {ruc[-3:]})",
        "estado": "ACTIVO",
        "condicion": "HABIDO",
        "direccion": "CALLE LOS MOCKS 456, LIMA",
        "ubigeo": "150101",
        "fuente": "MOCK_SUNAT"
    }
    
    # === LOGICA DE PRODUCCION (EJEMPLO CON APIPERU.DEV) ===
    # token = "TU_TOKEN_AQUI"
    # url = f"https://apiperu.dev/api/ruc/{ruc}?api_token={token}"
    # async with httpx.AsyncClient() as client:
    #     try:
    #         response = await client.get(url)
    #         if response.status_code == 200:
    #             data = response.json()
    #             if data.get("success"):
    #                 return data.get("data")
    #             raise HTTPException(status_code=404, detail="RUC no encontrado o inactivo.")
    #         else:
    #             raise HTTPException(status_code=500, detail="Error de proveedor de RUC")
    #     except Exception as e:
    #         raise HTTPException(status_code=500, detail=str(e))
