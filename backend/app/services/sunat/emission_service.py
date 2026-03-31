from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.sale_model import Sale
import traceback
import logging

logger = logging.getLogger(__name__)


def process_sunat_emission(sale_id: int):
    """
    Worker Background: Procesa la emisión a SUNAT via NubeFact para una venta.
    Se llama automáticamente en background al crear/anular una venta.
    """
    db = SessionLocal()
    try:
        logger.info(f"🚀 [Background] Iniciando emisión SUNAT para Venta #{sale_id}...")

        sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
        if not sale:
            logger.error(f"❌ [Background] Venta #{sale_id} no encontrada.")
            return

        # Saltar si ya fue procesada exitosamente
        if sale.sunat_status == "ACEPTADO":
            logger.info(f"ℹ️ [Background] Venta #{sale_id} ya tiene estado ACEPTADO. Se omite.")
            return

        # ── Llamar al conector real de NubeFact ──────────────────────────────
        from app.services.sunat.nubefact_service import emit_to_nubefact
        result = emit_to_nubefact(sale, db)

        # ── Actualizar la Venta según la respuesta ───────────────────────────
        if result.get("success"):
            sale.sunat_status   = "ACEPTADO"
            sale.invoice_series = result.get("invoice_series", "")
            sale.invoice_number = result.get("invoice_number", str(sale_id))
            sale.hash_cpe       = result.get("hash_cpe", "")
            sale.xml_url        = result.get("enlace_pdf", "")
            logger.info(f"✅ [Background] Venta #{sale_id} ACEPTADA por SUNAT via NubeFact.")
        else:
            sale.sunat_status = "ERROR_SUNAT"
            logger.error(
                f"🚨 [Background] Venta #{sale_id} error NubeFact: {result.get('error_msg')}"
            )

        db.commit()

    except Exception as e:
        logger.error(f"❌ [Background] Error crítico en Venta #{sale_id}: {str(e)}")
        traceback.print_exc()
        # Marcar como error para que el admin pueda reintentar desde la UI
        try:
            sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
            if sale and sale.sunat_status not in ("ACEPTADO",):
                sale.sunat_status = "ERROR_SUNAT"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
