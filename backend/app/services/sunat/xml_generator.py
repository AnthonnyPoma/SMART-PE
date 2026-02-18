import os
from jinja2 import Environment, FileSystemLoader
from datetime import datetime
from app.models.sale_model import Sale, SaleDetail
from app.models.client_model import Client
from app.models.store_model import Store

# Configurar Jinja2
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), 'templates')
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))

def generate_invoice_xml(sale: Sale, store: Store, client: Client):
    """
    Genera el XML UBL 2.1 para una venta (Boleta o Factura).
    """
    template = env.get_template('invoice.xml')
    
    # Datos básicos
    serie = "B001" if sale.invoice_type == "BOLETA" else "F001"
    numero = sale.invoice_number or str(sale.sale_id).zfill(8)
    fecha_emision = sale.date_created.strftime('%Y-%m-%d')
    hora_emision = sale.date_created.strftime('%H:%M:%S')
    
    # Emisor (Datos de la Tienda/Empresa)
    emisor = {
        "ruc": "20601234567",  # RUC fijo por ahora (debería venir de config)
        "razon_social": "SMART PE S.A.C.",
        "ubigeo": "150101",
        "direccion": store.address,
        "provincia": "LIMA",
        "departamento": "LIMA",
        "distrito": "LIMA"
    }
    
    # Cliente (Si es null, usar clientes varios para boleta)
    cliente_doc = "00000000"
    cliente_tipo = "1" # DNI
    cliente_nombre = "CLIENTES VARIOS"
    
    if client:
        cliente_doc = client.document_number
        cliente_nombre = f"{client.first_name} {client.last_name or ''}".strip()
        cliente_tipo = "1" if len(cliente_doc) == 8 else "6" # 1=DNI, 6=RUC

    cliente_dict = {
        "nro_doc": cliente_doc,
        "tipo_doc": cliente_tipo,
        "razon_social": cliente_nombre
    }
    
    # Cálculos Totales
    total_venta = float(sale.net_amount or sale.total_amount)
    total_gravadas = round(total_venta / 1.18, 2)
    total_igv = round(total_venta - total_gravadas, 2)
    
    items_list = []
    for detail in sale.details:
        valor_unitario = round(float(detail.unit_price) / 1.18, 2)
        valor_total = round(valor_unitario * detail.quantity, 2)
        igv_item = round((float(detail.unit_price) * detail.quantity) - valor_total, 2)
        
        items_list.append({
            "unidad": "NIU", # Unidades
            "cantidad": detail.quantity,
            "descripcion": detail.product.name if detail.product else "Item",
            "precio_unitario": f"{float(detail.unit_price):.2f}",
            "valor_unitario": f"{valor_unitario:.2f}",
            "valor_total": f"{valor_total:.2f}",
            "igv": f"{igv_item:.2f}"
        })

    # Renderizar
    xml_content = template.render(
        serie=serie,
        numero=numero,
        fecha_emision=fecha_emision,
        hora_emision=hora_emision,
        tipo_documento="03" if sale.invoice_type == "BOLETA" else "01",
        moneda="PEN",
        monto_letras="----", # TODO: Usar num2words
        emisor=emisor,
        cliente=cliente_dict,
        total_igv=f"{total_igv:.2f}",
        total_gravadas=f"{total_gravadas:.2f}",
        total_valor_venta=f"{total_gravadas:.2f}", # Generalmente igual a gravadas
        total_venta=f"{total_venta:.2f}",
        items=items_list
    )
    
    
    return xml_content

def generate_credit_note_xml(sale: Sale, related_sale: Sale, store: Store, client: Client):
    """
    Genera el XML UBL 2.1 para una Nota de Crédito.
    """
    template = env.get_template('credit_note.xml')
    
    # Datos básicos de la NC
    serie = "B002" if related_sale.invoice_type == "BOLETA" else "F002" # Serie distinta para NC
    # TODO: La serie debería venir de la BD también. Por ahora hardcode B002.
    numero = sale.invoice_number or str(sale.sale_id).zfill(8)
    fecha_emision = sale.date_created.strftime('%Y-%m-%d')
    hora_emision = sale.date_created.strftime('%H:%M:%S')
    
    # Doc. Referencia (La boleta que anulamos)
    ref_serie = related_sale.invoice_series or "B001"
    ref_numero = related_sale.invoice_number or str(related_sale.sale_id).zfill(8)
    ref_tipo = "03" if related_sale.invoice_type == "BOLETA" else "01"
    
    # Emisor
    emisor = {
        "ruc": "20601234567",
        "razon_social": "SMART PE S.A.C.",
        "ubigeo": "150101",
        "direccion": store.address,
        "provincia": "LIMA",
        "departamento": "LIMA",
        "distrito": "LIMA"
    }

    # Cliente
    cliente_doc = "00000000"
    cliente_tipo = "1"
    cliente_nombre = "CLIENTES VARIOS"
    
    if client:
        cliente_doc = client.document_number
        cliente_nombre = f"{client.first_name} {client.last_name or ''}".strip()
        cliente_tipo = "1" if len(cliente_doc) == 8 else "6"

    cliente_dict = {
        "nro_doc": cliente_doc,
        "tipo_doc": cliente_tipo,
        "razon_social": cliente_nombre
    }

    # Cálculos Totales (Deben coincidir con la venta original pero ser tratado como NC)
    # Nota: En NC, los valores son positivos en el XML, el tipo de documento 07 indica que resta.
    total_venta = float(abs(sale.net_amount or sale.total_amount))
    total_gravadas = round(total_venta / 1.18, 2)
    total_igv = round(total_venta - total_gravadas, 2)
    
    items_list = []
    # Usamos los detalles de la venta ORIGINAL (related_sale) porque estamos anulando todo
    # OJO: Si sale tiene sus propios detalles (anulación parcial), usar sale.details.
    # Asumiremos anulación total por ahora, usando los items originales.
    
    details_source = related_sale.details 
    
    for detail in details_source:
        valor_unitario = round(float(detail.unit_price) / 1.18, 2)
        valor_total = round(valor_unitario * detail.quantity, 2)
        igv_item = round((float(detail.unit_price) * detail.quantity) - valor_total, 2)
        
        items_list.append({
            "unidad": "NIU",
            "cantidad": detail.quantity,
            "descripcion": detail.product.name if detail.product else "Item",
            "precio_unitario": f"{float(detail.unit_price):.2f}",
            "valor_unitario": f"{valor_unitario:.2f}",
            "valor_total": f"{valor_total:.2f}",
            "igv": f"{igv_item:.2f}"
        })

    # Renderizar
    xml_content = template.render(
        serie=serie, # TODO: Guardar esta serie en sale.invoice_series antes de llamar
        numero=numero,
        fecha_emision=fecha_emision,
        hora_emision=hora_emision,
        moneda="PEN",
        
        documento_referencia=f"{ref_serie}-{ref_numero}",
        tipo_doc_referencia=ref_tipo,
        codigo_motivo="01", # 01 = Anulación de la operación
        descripcion_motivo=sale.credit_note_reason or "Anulación de la operación",
        
        emisor=emisor,
        cliente=cliente_dict,
        total_igv=f"{total_igv:.2f}",
        total_gravadas=f"{total_gravadas:.2f}",
        total_venta=f"{total_venta:.2f}",
        items=items_list
    )
    
    return xml_content
