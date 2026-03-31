from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    parent_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)

    # Relaciones
    subcategories = relationship("Category", backref="parent", remote_side=[category_id])

class Product(Base):
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    base_price = Column(Float)
    min_stock = Column(Integer, default=5)
    image_url = Column(String, nullable=True)
    average_cost = Column(Float, default=0)
    is_serializable = Column(Boolean, default=False)
    
    category_id = Column(Integer, ForeignKey("categories.category_id"))

    # Relaciones definidas al final del archivo para evitar ForwardRef


class Inventory(Base):
    __tablename__ = "inventory"

    inventory_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"))
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    quantity = Column(Integer, default=0)

    # Relaciones definidas al final del archivo

class ProductSeries(Base):
    __tablename__ = "product_series"

    series_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"))
    store_id = Column(Integer, ForeignKey("stores.store_id"))
    serial_number = Column(String, unique=True)
    status = Column(String, default="disponible") 
    cost = Column(Float, default=0) 

    # Relaciones definidas al final del archivo

# ==========================================
# DEFINICIÓN DE RELACIONES EXTERNAS (Para evitar ForwardRef errors)
# ==========================================
# Category <-> Product
Category.products = relationship(Product, back_populates="category")
Product.category = relationship(Category, back_populates="products")

# Product <-> Inventory
Product.inventory = relationship(Inventory, back_populates="product")
Inventory.product = relationship(Product, back_populates="inventory")
Inventory.store = relationship("Store") 

# Product <-> ProductSeries
Product.series = relationship(ProductSeries, back_populates="product")
ProductSeries.product = relationship(Product, back_populates="series")

# Product <-> InventoryMovement (External)
Product.movements = relationship("InventoryMovement", back_populates="product")