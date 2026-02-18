import requests
import base64
import zipfile
import io
from lxml import etree

# URL Beta SUNAT
SUNAT_URL = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"

# Credenciales Beta (Genéricas)
RUC_EMISOR = "20601234567" # Debería ser el RUC de prueba de SUNAT (20000000001) para Beta, pero usaremos el nuestro
USER_SOL = "MODDATOS"
PASS_SOL = "MODDATOS"

def send_bill(filename: str, xml_signed_content: bytes):
    """
    Empaqueta el XML firmado en un ZIP y lo envía a SUNAT.
    Retorna el status y el CDR (si existe).
    """
    # 1. Comprimir en ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr(f"{filename}.xml", xml_signed_content)
    
    zip_bytes = zip_buffer.getvalue()
    zip_base64 = base64.b64encode(zip_bytes).decode('utf-8')
    
    # 2. Construir Envelope SOAP (sendBill)
    soap_params = f"""
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <soapenv:Header>
            <wsse:Security>
                <wsse:UsernameToken>
                    <wsse:Username>{RUC_EMISOR}{USER_SOL}</wsse:Username>
                    <wsse:Password>{PASS_SOL}</wsse:Password>
                </wsse:UsernameToken>
            </wsse:Security>
        </soapenv:Header>
        <soapenv:Body>
            <ser:sendBill>
                <fileName>{filename}.zip</fileName>
                <contentFile>{zip_base64}</contentFile>
            </ser:sendBill>
        </soapenv:Body>
    </soapenv:Envelope>
    """
    
    # 3. Enviar a SUNAT
    headers = {'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': 'urn:sendBill'}
    
    try:
        response = requests.post(SUNAT_URL, data=soap_params, headers=headers, timeout=30)
        
        # 4. Procesar Respuesta
        if response.status_code == 200:
            root = etree.fromstring(response.content)
            # Buscar applicationResponse (CDR)
            # Buscar applicationResponse (CDR)
            app_response = root.xpath('//*[local-name()="applicationResponse"]')
            if app_response:
                cdr_base64 = app_response[0].text
                return {"success": True, "cdr": cdr_base64, "message": "Enviado correctamente"}
            
            # Buscar Fault (Error)
            fault = root.xpath('//faultstring')
            if fault:
                 return {"success": False, "error": fault[0].text}
                 
        return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}

    except Exception as e:
        return {"success": False, "error": str(e)}
