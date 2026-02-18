try:
    print("Importing Database...")
    from app.core.database import Base, engine
    
    print("Importing ALL models...")
    from app.models.transfer_model import Transfer
    from app.models.user_model import User
    from app.models.store_model import Store
    from app.models.product_model import Product
    from app.models.inventory_movement_model import InventoryMovement
    from app.models.sale_model import Sale
    from app.models.supplier_model import Supplier
    from app.models.client_model import Client
    # Imports de routers que podrían disparar inspección de Pydantic
    from app.schemas.transfer_schema import TransferCreate
    
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("SUCCESS: Tables created.")
except Exception as e:
    print("CRITICAL ERROR:")
    print(e)
    import traceback
    traceback.print_exc()
