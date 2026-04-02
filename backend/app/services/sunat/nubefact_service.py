"""
Servicio de Integración con NubeFact API
Documentación: https://www.nubefact.com/integracion_api/ (requiere login)

IMPORTANTE - Catálogo NubeFact (DIFERENTE al catálogo SUNAT):
  NubeFact usa su propia numeración interna de tipos de comprobante:
    1 = Factura Electrónica
    2 = Boleta de Venta Electrónica
    3 = Nota de Crédito Electrónica
  No usar los códigos de SUNAT (01, 03, 07) directamente.
"""
import os
import requests
import logging
from datetime import date
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

NUBEFACT_URL   = os.getenv("NUBEFACT_URL", "")
NUBEFACT_TOKEN = os.getenv("NUBEFACT_TOKEN", "")

# ─── Catálogo NubeFact ────────────────────────────────────────────────────────
TIPO_COMPROBANTE_NUBEFACT = {
    "FACTURA": 1,   # Factura Electrónica
    "BOLETA":  2,   # Boleta de Venta Electrónica
    "NC":      3,   # Nota de Crédito Electrónica
}

# Tipo de documento del cliente (sí corresponde a SUNAT)
TIPO_DOC_CLIENTE = {
    "DNI": "1",
    "CE":  "4",   # Carnet de Extranjería
    "RUC": "6",
    "PAS": "7",   # Pasaporte
}

CLIENTE_ANONIMO_DOC_TYPE = "-"
CLIENTE_ANONIMO_DOC_NUM  = "-"
CLIENTE_ANONIMO_NOMBRE   = "CLIENTE ANONIMO"

UNIDAD_UNIDAD = "NIU"   # Unidad de producto (catálogo SUNAT)


def _get_serie(doc_type: str, settings_dict: dict) -> str:
    """
    Retorna la serie según tipo de comprobante.
    Series configuradas en la cuenta Demo de NubeFact:
      BBB1 → Boletas de Venta Electrónica
      FFF1 → Facturas Electrónicas
    """
    if doc_type == "FACTURA":
        return settings_dict.get("invoice_series_factura", "FFF1")
    if doc_type == "NC":
        return settings_dict.get("invoice_series_nc", "BBB1")
    return settings_dict.get("invoice_series_boleta", "BBB1")


def build_nubefact_payload(sale, db: Session) -> dict:
    """
    Construye el JSON que espera la API de NubeFact.

    Reglas clave aplicadas:
    - tipo_de_comprobante: Usa el catálogo de NubeFact (2=Boleta, 1=Factura, 3=NC)
    - fecha_de_emision: YYYY-MM-DD (HOY siempre, SUNAT no acepta fechas pasadas)
    - numero: 0 para que NubeFact asigne el correlativo automáticamente
    - NC include campos obligatorios de referencia a venta original
    - Boleta/Factura NO incluyen campos NC (NubeFact los rechaza si vienen vacíos)
    """
    from app.models.client_model import Client
    from app.models.product_model import Product
    from app.models.setting_model import Setting

    # ── Settings de empresa ───────────────────────────────────────────────────
    settings_rows = db.query(Setting).all()
    settings = {s.key: s.value for s in settings_rows}

    # ── Determinar tipo de comprobante ────────────────────────────────────────
    invoice_type = sale.invoice_type or "BOLETA"

    # Tipos desconocidos (ej: 'WEB' del mock antiguo) → emitir como Boleta
    if invoice_type not in ("BOLETA", "FACTURA", "NC"):
        invoice_type = "BOLETA"
        logger.info(f"ℹ️  Venta #{sale.sale_id}: tipo '{sale.invoice_type}' → fallback BOLETA")

    # NC sin venta de referencia → emitir como Boleta (datos de test o mock)
    if invoice_type == "NC" and not sale.related_sale_id:
        invoice_type = "BOLETA"
        logger.warning(
            f"⚠️  Venta #{sale.sale_id}: NC sin related_sale_id → emitiendo como BOLETA"
        )

    tipo_num = TIPO_COMPROBANTE_NUBEFACT.get(invoice_type, 2)  # default=2 (Boleta)
    serie    = _get_serie(invoice_type, settings)
    logger.info(f"📄 Venta #{sale.sale_id}: tipo={invoice_type} | nubefact_code={tipo_num} | serie={serie}")

    # ── Fecha → HOY en formato YYYY-MM-DD (requerido por NubeFact) ────────────
    fecha_emision = date.today().strftime("%Y-%m-%d")

    # ── Datos de cliente ──────────────────────────────────────────────────────
    cli_tipo_num  = CLIENTE_ANONIMO_DOC_TYPE
    cli_doc_num   = CLIENTE_ANONIMO_DOC_NUM
    cli_nombre    = CLIENTE_ANONIMO_NOMBRE
    cli_direccion = "-"

    if sale.client_id:
        client = db.query(Client).filter(Client.client_id == sale.client_id).first()
        if client:
            doc_type = client.document_type or "DNI"
            doc_num  = (client.document_number or "").strip()
            
            # Validación estricta anti-rechazos de SUNAT/NubeFact
            is_valid_dni = doc_type == "DNI" and len(doc_num) == 8 and doc_num.isdigit()
            is_valid_ruc = doc_type == "RUC" and len(doc_num) == 11 and doc_num.isdigit()
            is_valid_ce  = doc_type == "CE" and len(doc_num) >= 8
            is_valid_pas = doc_type == "PAS" and len(doc_num) >= 6
            
            cli_nombre    = f"{client.first_name} {client.last_name or ''}".strip() or CLIENTE_ANONIMO_NOMBRE
            cli_direccion = client.address or "-"
            
            if is_valid_dni or is_valid_ruc or is_valid_ce or is_valid_pas:
                cli_tipo_num  = TIPO_DOC_CLIENTE.get(doc_type, "1")
                cli_doc_num   = doc_num
            else:
                # Comprador WEB o sin DNI válido -> Documento "0" (Público General/Varios)
                cli_tipo_num  = CLIENTE_ANONIMO_DOC_TYPE
                cli_doc_num   = CLIENTE_ANONIMO_DOC_NUM

    # ── Ítems ─────────────────────────────────────────────────────────────────
    items = []
    for detail in sale.details:
        product   = db.query(Product).filter(Product.product_id == detail.product_id).first()
        prod_name = product.name if product else "Producto"

        unit_price_con_igv = float(detail.unit_price)
        unit_price_sin_igv = round(unit_price_con_igv / 1.18, 6)
        igv_unit           = round(unit_price_con_igv - unit_price_sin_igv, 6)
        subtotal_sin_igv   = round(unit_price_sin_igv * detail.quantity, 2)

        items.append({
            "unidad_de_medida": UNIDAD_UNIDAD,
            "codigo":           str(detail.product_id),
            "descripcion":      prod_name,
            "cantidad":         detail.quantity,
            "valor_unitario":   unit_price_sin_igv,
            "precio_unitario":  unit_price_con_igv,
            "subtotal":         subtotal_sin_igv,
            "tipo_de_igv":      1,
            "igv":              round(igv_unit * detail.quantity, 2),
            "total":            float(detail.subtotal),
        })

    # ── Totales ───────────────────────────────────────────────────────────────
    total_con_igv = float(sale.net_amount or sale.total_amount)
    total_sin_igv = round(total_con_igv / 1.18, 2)
    total_igv     = round(total_con_igv - total_sin_igv, 2)
    descuento     = float(sale.discount_amount or 0)

    # ── Payload base ──────────────────────────────────────────────────────────
    payload = {
        "operacion":                         "generar_comprobante",
        "tipo_de_comprobante":               tipo_num,          # ← 1/2/3 (NubeFact)
        "serie":                             serie,
        "numero":                            0,                 # 0 = correlativo automático
        "sunat_transaction":                 1,
        "cliente_tipo_de_documento":         cli_tipo_num,
        "cliente_numero_de_documento":       cli_doc_num,
        "cliente_denominacion":              cli_nombre,
        "cliente_direccion":                 cli_direccion,
        "cliente_email":                     "",
        "cliente_email_1":                   "",
        "cliente_email_2":                   "",
        "fecha_de_emision":                  fecha_emision,     # ← YYYY-MM-DD
        "fecha_de_vencimiento":              "",
        "moneda":                            1,
        "tipo_de_cambio":                    "",
        "porcentaje_de_igv":                 18.00,
        "descuento_global":                  "",
        "total_descuento":                   "",
        "total_anticipo":                    "",
        "total_gravada":                     total_sin_igv,
        "total_inafecta":                    "",
        "total_exonerada":                   "",
        "total_igv":                         total_igv,
        "total_gratuita":                    "",
        "total_otros_cargos":                "",
        "total":                             total_con_igv,
        "percepcion_tipo":                   "",
        "percepcion_base_imponible":         "",
        "total_percepcion":                  "",
        "total_incluido_percepcion":         "",
        "detraccion":                        False,
        "observaciones":                     "",
        "enviar_automaticamente_a_la_sunat": True,
        "enviar_automaticamente_al_cliente": False,
        "condiciones_de_pago":               "",
        "medio_de_pago":                     "",
        "placa_vehiculo":                    "",
        "orden_compra_servicio":             "",
        "tabla_personalizada_codigo":        "",
        "formato_de_pdf":                    "",
        "codigo_unico":                      str(sale.sale_id),  # Identificador único anti-duplicados
        "items":                             items,
    }

    # ── Campos exclusivos NC (solo si es Nota de Crédito CON referencia) ──────
    # CRÍTICO: Para Boleta/Factura estos campos deben estar AUSENTES.
    # NubeFact los rechaza incluso como strings vacíos.
    if invoice_type == "NC" and sale.related_sale_id:
        from app.models.sale_model import Sale as SaleModel
        related    = db.query(SaleModel).filter(SaleModel.sale_id == sale.related_sale_id).first()
        ref_serie  = related.invoice_series if related and related.invoice_series else _get_serie("BOLETA", settings)
        ref_numero = related.invoice_number if related and related.invoice_number else str(sale.related_sale_id)
        ref_tipo   = TIPO_COMPROBANTE_NUBEFACT.get(related.invoice_type if related else "BOLETA", 2)

        payload.update({
            "tipo_de_nota_de_credito":          "1",   # 1 = Anulación de la operación
            "tipo_de_nota_de_debito":           "",
            "documento_que_se_modifica_tipo":   ref_tipo,
            "documento_que_se_modifica_serie":  ref_serie,
            "documento_que_se_modifica_numero": int(ref_numero) if str(ref_numero).isdigit() else 1,
        })

    return payload


def emit_to_nubefact(sale, db: Session) -> dict:
    """
    Envía el payload a NubeFact y retorna un dict normalizado con el resultado.
    """
    if not NUBEFACT_URL or not NUBEFACT_TOKEN:
        logger.error("❌ Variables NUBEFACT_URL o NUBEFACT_TOKEN no en .env")
        return {"success": False, "sunat_status": "ERROR",
                "error_msg": "Credenciales NubeFact no configuradas. Revisar .env"}

    try:
        payload = build_nubefact_payload(sale, db)
        headers = {
            "Authorization": f'Token token="{NUBEFACT_TOKEN}"',
            "Content-Type":  "application/json",
        }

        import json as _json
        logger.info(f"🚀 [NubeFact] Iniciando → Venta #{sale.sale_id} | Serie {payload['serie']} | Fecha {payload['fecha_de_emision']}")
        logger.debug(f"📦 PAYLOAD #{sale.sale_id}:\n{_json.dumps(payload, ensure_ascii=False, indent=2)}")

        response = requests.post(NUBEFACT_URL, json=payload, headers=headers, timeout=10)
        data     = response.json()
        logger.info(f"📨 [NubeFact] Respuesta #{sale.sale_id}: HTTP {response.status_code} | {data}")

        if response.status_code == 200 and data.get("errors") is None:
            return {
                "success":        True,
                "sunat_status":   "ACEPTADO",
                "invoice_series": data.get("serie", payload["serie"]),
                "invoice_number": str(data.get("numero", sale.sale_id)),
                "hash_cpe":       data.get("codigo_hash", ""),
                "enlace_pdf":     data.get("enlace_del_pdf", "") or data.get("enlace_del_xml", ""),
                "error_msg":      None,
            }
        else:
            err = data.get("errors") or str(data)
            logger.error(f"🚨 [NubeFact] Rechazó #{sale.sale_id}: {err}")
            return {"success": False, "sunat_status": "RECHAZADO", "error_msg": str(err)}

    except requests.exceptions.Timeout:
        msg = f"Timeout NubeFact (Venta #{sale.sale_id})"
        logger.error(f"⏱️ {msg}")
        return {"success": False, "sunat_status": "ERROR", "error_msg": msg}

    except Exception as e:
        msg = str(e)
        logger.error(f"❌ Error inesperado NubeFact #{sale.sale_id}: {msg}")
        return {"success": False, "sunat_status": "ERROR", "error_msg": msg}
