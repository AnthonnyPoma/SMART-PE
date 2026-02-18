import requests

# NOTA: Para producción, aquí usarías un token de pago de servicios como ApisPeru.com
# Para desarrollo, simularemos o usaremos un endpoint gratuito si está disponible.


def get_person_from_reniec(dni: str):
    if len(dni) != 8:
        return None
    # SIMULACIÓN (Para que funcione en tu tesis sin pagar API todavía)
    # Aquí podrías poner un request.get real a una API pública
    
    mock_db = {
        "12345678": "JUAN PEREZ PRUEBA",
        "87654321": "MARIA LOPEZ TEST"
    }
    name = mock_db.get(dni)
    if name:
        return {"dni": dni, "nombres": name, "apellidoPaterno": "", "apellidoMaterno": ""}
    
    return None

    # EJEMPLO REAL (Cuando tengas token):
    # url = f"https://api.apis.net.pe/v1/dni?numero={dni}"
    # response = requests.get(url, headers={"Authorization": "Bearer TOKEN"})
    # return response.json()