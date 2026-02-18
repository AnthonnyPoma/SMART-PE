"""
Script para agregar columnas faltantes a la base de datos.
Ejecutar una sola vez después de actualizar los modelos.
"""
from sqlalchemy import text
from app.core.database import engine

def run_migrations():
    migrations = [
        # Tabla users - campo supervisor_pin
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_pin VARCHAR(6)",
        
        # Tabla sales - campos de descuento
        "ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0",
        "ALTER TABLE sales ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2)",
        "ALTER TABLE sales ADD COLUMN IF NOT EXISTS promotion_id INTEGER",
        "ALTER TABLE sales ADD COLUMN IF NOT EXISTS approved_by INTEGER",
        
        # Tabla promotions (crear si no existe)
        """
        CREATE TABLE IF NOT EXISTS promotions (
            promotion_id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(20) UNIQUE,
            discount_type VARCHAR(20) NOT NULL,
            value NUMERIC(10,2) NOT NULL,
            min_purchase NUMERIC(10,2),
            max_discount NUMERIC(10,2),
            requires_approval BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            valid_from TIMESTAMP WITH TIME ZONE,
            valid_until TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by INTEGER
        )
        """
    ]
    
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                print(f"✅ Ejecutado: {sql[:50]}...")
            except Exception as e:
                print(f"⚠️ Error (puede ser normal): {e}")
        conn.commit()
    
    print("\n✅ Migraciones completadas!")

if __name__ == "__main__":
    run_migrations()
