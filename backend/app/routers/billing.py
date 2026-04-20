from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.sale_model import Sale
from app.models.client_model import Client
from app.models.store_model import Store
from app.models.user_model import User
from app.dependencies import get_current_user
from app.services.sunat import xml_generator, xml_signer, xml_sender

router = APIRouter()

@router.post("/billing/emit/{sale_id}")
def emit_electronic_receipt(sale_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Genera, firma y envía el comprobante electrónico a SUNAT.
    """
    # 1. Obtener datos de la venta
    sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
        
    store = db.query(Store).filter(Store.store_id == sale.store_id).first()
    client = None
    if sale.client_id:
        client = db.query(Client).filter(Client.client_id == sale.client_id).first()
        
    try:
        # 2. Generar XML
        xml_content = xml_generator.generate_invoice_xml(sale, store, client)
        
        # 3. Firmar XML
        xml_signed = xml_signer.sign_xml(xml_content)
        
        # 4. Enviar a SUNAT
        # Formato nombre: RUC-TIPO-SERIE-NUMERO (20601234567-03-B001-00000123)
        # Nota: En Beta usamos RUC Emisor de prueba, pero aquí construimos con el nuestro o el configurado
        tipo_doc = "03" if sale.invoice_type == "BOLETA" else "01"
        serie = "B001" if sale.invoice_type == "BOLETA" else "F001"
        numero = str(sale.sale_id).zfill(8)
        filename = f"20601234567-{tipo_doc}-{serie}-{numero}"
        
        result = xml_sender.send_bill(filename, xml_signed)
        
        if result["success"]:
            # Actualizar estado venta
            sale.sunat_status = "ACEPTADO"
            # sale.cdr_hash = ... # Podríamos extraerlo del CDR
            db.commit()
            return {"status": "success", "message": "Comprobante emitido y aceptado por SUNAT", "cdr": result.get("cdr")}
        else:
            sale.sunat_status = "RECHAZADO" # O ERROR
            db.commit()
            return {"status": "error", "message": result.get("error")}

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error facturación: {e}")
        raise HTTPException(status_code=500, detail=str(e))
