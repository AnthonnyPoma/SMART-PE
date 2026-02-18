from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Crear el motor (Engine) usando la URL del .env
engine = create_engine(settings.DATABASE_URL)

# 2. Crear la sesión. Cada petición del usuario tendrá su propia sesión.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Base para los modelos (tablas)
Base = declarative_base()

# 4. Dependencia: Esta función se usará en cada endpoint para obtener la DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()