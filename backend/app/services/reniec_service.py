import requests
import os

# ── Servicio RENIEC / Registro Civil ─────────────────────────────────────────
# MODO ACTUAL: Simulación (no requiere pago)
# MODO PRODUCCION: Descomentar la sección "REAL" y añadir RENIEC_TOKEN al .env
# Proveedores recomendados: apis.net.pe (~S/30/mes) | apiperu.dev (gratuito limitado)
# ─────────────────────────────────────────────────────────────────────────────

RENIEC_TOKEN = os.getenv("RENIEC_TOKEN", "")  # Token real cuando se contrate


def get_person_from_reniec(dni: str):
    if not dni or len(dni) != 8 or not dni.isdigit():
        return None

    # ── MODO REAL (descomentar cuando tengas token) ──────────────────────────
    # if RENIEC_TOKEN:
    #     try:
    #         url = f"https://api.apis.net.pe/v2/reniec/dni?numero={dni}"
    #         headers = {"Authorization": f"Bearer {RENIEC_TOKEN}", "Referer": "https://apis.net.pe"}
    #         resp = requests.get(url, headers=headers, timeout=5)
    #         if resp.status_code == 200:
    #             data = resp.json()
    #             return {
    #                 "dni": dni,
    #                 "nombres": data.get("nombres", ""),
    #                 "apellidoPaterno": data.get("apellidoPaterno", ""),
    #                 "apellidoMaterno": data.get("apellidoMaterno", ""),
    #             }
    #     except Exception:
    #         pass  # Si falla la API real, caer al mock

    # ── MODO SIMULACIÓN ──────────────────────────────────────────────────────
    # DNIs específicos pre-cargados (para demos controladas)
    mock_db = {
        "12345678": ("JUAN CARLOS",  "PÉREZ",    "TORRES"),
        "87654321": ("MARÍA",        "GARCÍA",   "LÓPEZ"),
        "11111111": ("CARLOS",       "QUISPE",   "MAMANI"),
        "22222222": ("ANA LUCIA",    "FLORES",   "RAMOS"),
    }

    if dni in mock_db:
        nombres, ap, am = mock_db[dni]
        return {"dni": dni, "nombres": nombres, "apellidoPaterno": ap, "apellidoMaterno": am}

    # Para cualquier otro DNI válido de 8 dígitos: devuelve nombre genérico
    # Esto evita "DNI no encontrado" durante demos con DNIs reales no pre-cargados
    return {"dni": dni, "nombres": "CLIENTE", "apellidoPaterno": "REGISTRADO", "apellidoMaterno": ""}