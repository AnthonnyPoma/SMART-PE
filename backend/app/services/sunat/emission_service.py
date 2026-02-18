from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.sale_model import Sale
from app.models.store_model import Store
from app.models.client_model import Client
from app.services.sunat import xml_generator, xml_signer, xml_sender
from lxml import etree
import traceback

def process_sunat_emission(sale_id: int):
    """
    Procesa la emisión a SUNAT para una venta dada.
    Esta función está diseñada para correr en background.
    """
    db = SessionLocal()
    try:
        print(f"🚀 [Background] Iniciando emisión SUNAT para Venta #{sale_id}...")
        
        # 1. Obtener Datos
        sale = db.query(Sale).filter(Sale.sale_id == sale_id).first()
        if not sale:
            print(f"❌ [Background] Venta {sale_id} no encontrada.")
            return

        store = db.query(Store).filter(Store.store_id == sale.store_id).first()
        client = None
        if sale.client_id:
            client = db.query(Client).filter(Client.client_id == sale.client_id).first()

        # 2. Generar XML
        if sale.invoice_type == "NC":
            # Obtener venta relacionada
            related_sale = db.query(Sale).filter(Sale.sale_id == sale.related_sale_id).first()
            if not related_sale:
                print(f"❌ [Background] Venta relacionada {sale.related_sale_id} no encontrada.")
                return
            
            # Asignar serie/numero si no existen (aunque deberían venir del endpoint)
            if not sale.invoice_series:
                sale.invoice_series = "B002" if related_sale.invoice_type == "BOLETA" else "F002"
            if not sale.invoice_number:
                sale.invoice_number = str(sale.sale_id).zfill(8)
                
            xml_content = xml_generator.generate_credit_note_xml(sale, related_sale, store, client)
            tipo_doc = "07"
            
        else:
            # Boleta / Factura
            xml_content = xml_generator.generate_invoice_xml(sale, store, client)
            tipo_doc = "03" if sale.invoice_type == "BOLETA" else "01"

        # 3. Firmar XML
        xml_signed = xml_signer.sign_xml(xml_content)
        
        # 4. Enviar a SUNAT
        # Formato nombre: RUC-TIPO-SERIE-NUMERO (20601234567-03-B001-00000123)
        serie = sale.invoice_series or ("B001" if sale.invoice_type == "BOLETA" else "F001")
        numero = sale.invoice_number or str(sale.sale_id).zfill(8)
        
        filename = f"20601234567-{tipo_doc}-{serie}-{numero}"
        
        result = xml_sender.send_bill(filename, xml_signed)
        
        # 5. Actualizar Estado
        if result["success"]:
            sale.sunat_status = "ACEPTADO"
            
            # Extraer Hash CPE (DigestValue) del XML Firmado
            try:
                root = etree.fromstring(xml_signed)
                namespaces = {'ds': 'http://www.w3.org/2000/09/xmldsig#'}
                digest_value = root.xpath('//ds:DigestValue', namespaces=namespaces)
                if digest_value:
                    sale.hash_cpe = digest_value[0].text
                    print(f"🔑 [Background] Hash CPE extraído: {sale.hash_cpe}")
            except Exception as e_hash:
                print(f"⚠️ [Background] No se pudo extraer Hash CPE: {e_hash}")

            print(f"✅ [Background] Venta #{sale_id} ACEPTADA por SUNAT.")
        else:
            sale.sunat_status = "RECHAZADO" # O ERROR
            print(f"\n\n🚨 [FATAL SUNAT ERROR] Venta #{sale_id} RECHAZADA/ERROR:\n{result}\n\n")
            
        db.commit()

    except Exception as e:
        print(f"❌ [Background] Error crítico en venta #{sale_id}: {str(e)}")
        traceback.print_exc()
    finally:
        db.close()
