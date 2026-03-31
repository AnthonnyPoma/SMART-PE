from sqlalchemy import Column, Integer, String, Text
from app.core.database import Base

class Setting(Base):
    __tablename__ = "settings"

    setting_id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    description = Column(String(255), nullable=True)
