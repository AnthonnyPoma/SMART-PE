import requests
import json

SALE_ID = 42
URL = f"http://127.0.0.1:8000/billing/emit/{SALE_ID}"

try:
    print(f"📡 Enviando solicitud para Venta #{SALE_ID}...")
    response = requests.post(URL)
    
    print(f"Status Code: {response.status_code}")
    
    with open("result.log", "w", encoding="utf-8") as f:
        f.write(f"Status Code: {response.status_code}\n")
        try:
            data = response.json()
            f.write(json.dumps(data, indent=2))
        except:
            f.write(response.text)

except Exception as e:
    with open("result.log", "w", encoding="utf-8") as f:
        f.write(f"Error: {e}")
