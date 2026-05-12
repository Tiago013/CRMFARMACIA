from pydantic import BaseModel
from typing import List, Optional

class ProductRecommendation(BaseModel):
    product_id: str
    product_name: str
    reason: str
    confidence_score: float

class PatientInsight(BaseModel):
    insight_type: str  # e.g., 'refill_reminder', 'churn_risk', 'upsell_opportunity'
    description: str
    actionable_step: str
    priority: str  # 'high', 'medium', 'low'

class AIProfileContext(BaseModel):
    patient_id: str
    churn_risk_score: float
    recommendations: List[ProductRecommendation]
    insights: List[PatientInsight]
