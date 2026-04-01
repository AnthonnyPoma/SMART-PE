# This file makes the models directory a Python package
# and allows imports like: from app.models import user_model

from . import (
    user_model,
    role_model,
    store_model,
    category_model, # Reordered
    product_model,
    sale_model,
    client_model,
    inventory_movement_model,
    supplier_model,
    transfer_model,
    promotion_model,
)

__all__ = [
    "user_model",
    "role_model",
    "store_model",
    "product_model",
    "sale_model",
    "client_model",
    "inventory_movement_model",
    "supplier_model",
    "category_model",
    "transfer_model",
    "promotion_model",
    "loyalty_model",
]
