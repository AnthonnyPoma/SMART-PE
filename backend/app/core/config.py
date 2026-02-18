import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "SMART PE"
    PROJECT_VERSION: str = "1.0.0"
    
    # Aquí leemos las variables del archivo .env
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    # ESTA ES LA LÍNEA QUE FALTABA 👇
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey") 

settings = Settings()