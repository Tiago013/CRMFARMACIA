from fastapi import APIRouter, HTTPException
from app.modules.pos.schemas import POSCheckoutRequest, POSCheckoutResponse
from app.modules.pos.checkout import CheckoutEngine

router = APIRouter(prefix="/pos", tags=["POS Enterprise"])
checkout_engine = CheckoutEngine()

@router.post("/checkout", response_model=POSCheckoutResponse)
async def process_pos_checkout(request: POSCheckoutRequest):
    """
    Procesa un carrito de compras en la caja registradora.
    Incluye validación de pagos, stock y promociones automáticas.
    """
    try:
        response = await checkout_engine.process_checkout(request)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno en Checkout Engine")
