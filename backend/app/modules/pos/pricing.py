from typing import List
from app.modules.pos.schemas import POSItem

class PricingEngine:
    """
    Motor centralizado de precios y promociones.
    """
    def calculate_total(self, items: List[POSItem]) -> float:
        total = 0.0
        for item in items:
            # Lógica de impuestos y descuentos por item
            subtotal = item.quantity * item.unit_price
            discount_amount = subtotal * (item.discount / 100)
            total += (subtotal - discount_amount)
        
        # Futuro: Promociones globales, bundles 2x1, reglas dinámicas.
        return total
