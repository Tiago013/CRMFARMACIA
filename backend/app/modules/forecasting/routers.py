from fastapi import APIRouter
from app.modules.forecasting.schemas import ForecastResponse, CustomerScore
from app.modules.forecasting.services import ForecastingService

router = APIRouter(prefix="/forecasting", tags=["Forecasting & ML"])
forecast_service = ForecastingService()

@router.get("/demand", response_model=ForecastResponse)
async def get_demand_forecast(product_id: str = "ALL"):
    """
    Retorna la predicción de demanda de un producto (o global) calculada por el motor de ML.
    """
    return forecast_service.get_demand_forecast(product_id)

@router.get("/scoring/patient/{patient_id}", response_model=CustomerScore)
async def get_patient_scoring(patient_id: str):
    """
    Retorna el modelo predictivo del cliente (LTV futuro, riesgo de churn, segmento).
    """
    return forecast_service.get_customer_scoring(patient_id)
