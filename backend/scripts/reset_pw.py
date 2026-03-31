from sqlalchemy import text
from app.core.database import SessionLocal
from app.core.security import get_password_hash

db = SessionLocal()
new_hash = get_password_hash("admin123")
db.execute(text("UPDATE users SET password_hash = :h WHERE username = 'admin'"), {"h": new_hash})
db.commit()
print("Admin password reset to admin123 ✅")
db.close()
