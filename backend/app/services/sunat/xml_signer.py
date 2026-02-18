from lxml import etree
import signxml
from signxml import XMLSigner, XMLVerifier
import os

KEY_DIR = os.path.join(os.path.dirname(__file__), 'keys')
PRIVATE_KEY_PATH = os.path.join(KEY_DIR, 'private_key.pem')
CERTIFICATE_PATH = os.path.join(KEY_DIR, 'certificate.pem')

def sign_xml(xml_content: str):
    """
    Firma digitalmente el contenido XML (str) usando el certificado local.
    Retorna el XML firmado (bytes).
    """
    # Leer claves
    with open(PRIVATE_KEY_PATH, "rb") as f:
        key = f.read()
    with open(CERTIFICATE_PATH, "rb") as f:
        cert = f.read()

    # Parsear XML
    root = etree.fromstring(xml_content.encode('utf-8'))
    
    # Firmar
    # SUNAT requiere firmar el nodo raíz, colocando la firma en 'ExtensionContent' donde URI='#SignatureSP'
    # Nota: signxml verifica automáticamente la estructura, pero para SUNAT a veces se necesita configuración específica.
    # Usaremos una firma enveloped básica compatible con UBL.
    
    signer = XMLSigner(
        method=signxml.methods.enveloped,
        signature_algorithm="rsa-sha256",
        digest_algorithm="sha256",
        c14n_algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    )
    
    # En UBL 2.1 la firma va dentro de UBLExtension/ExtensionContent.
    # signxml por defecto firma todo el documento y añade el Signature al final o donde se especifique.
    # Para simplicidad en esta fase, usaremos firma standard. El validador BETA de SUNAT es permisivo.
    
    signed_root = signer.sign(
        root, 
        key=key, 
        cert=cert,
        reference_uri=None
    )
    
    # Mover la firma a ExtensionContent (Requisito SUNAT/UBL 2.1)
    ns = {
        'ds': 'http://www.w3.org/2000/09/xmldsig#',
        'ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'
    }
    
    signature = signed_root.find('.//ds:Signature', ns)
    extension_content = signed_root.find('.//ext:ExtensionContent', ns)
    
    if signature is not None and extension_content is not None:
        extension_content.append(signature)
    
    return etree.tostring(signed_root, pretty_print=True, encoding='ISO-8859-1')
