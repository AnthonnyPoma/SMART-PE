import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str    = "SMART PE"
    PROJECT_VERSION: str = "1.0.0"

    # Base de datos
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # JWT — Clave secreta desde .env (NUNCA hardcodear aquí)
    # Si no hay SECRET_KEY en .env se lanza error en arranque para forzar buena configuración
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")

    # Duración del token JWT (configurable desde .env)
    # Desarrollo: 480 min (8h) | Producción: recomendar 60 min
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

    def __post_init__(self):
        if not self.SECRET_KEY:
            raise EnvironmentError(
                "❌ SECRET_KEY no está definida en el archivo .env. "
                "Genera una con: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if not self.DATABASE_URL:
            raise EnvironmentError("❌ DATABASE_URL no está definida en el archivo .env.")

settings = Settings()