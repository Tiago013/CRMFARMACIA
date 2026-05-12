from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price_monthly: float
    features: list[str]
    max_users: int

class TenantBilling(BaseModel):
    tenant_id: str
    plan_id: str
    status: str # "active", "trial", "past_due", "canceled"
    current_period_end: datetime
    usage_count: int
