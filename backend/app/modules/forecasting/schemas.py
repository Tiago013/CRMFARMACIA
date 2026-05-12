from pydantic import BaseModel
from typing import List, Optional

class DataPoint(BaseModel):
    date: str
    value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None

class ForecastResponse(BaseModel):
    product_id: str
    product_name: str
    historical_data: List[DataPoint]
    forecast_data: List[DataPoint]
    confidence_level: float
    anomaly_detected: bool
    explanation: str

class CustomerScore(BaseModel):
    patient_id: str
    ltv_prediction: float
    churn_probability: float
    next_purchase_days: int
    segment: str
