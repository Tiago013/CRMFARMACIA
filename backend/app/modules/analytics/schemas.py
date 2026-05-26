from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class KPIData(BaseModel):
    title: str
    value: str
    change: str
    trend: str # 'up' or 'down'

class SalesChartData(BaseModel):
    date: str
    revenue: float
    orders: int

class CategoryDistribution(BaseModel):
    name: str
    value: int

class PeakHourData(BaseModel):
    hour: str
    orders: int
    revenue: float

class TopProfitableProduct(BaseModel):
    name: str
    margin_percentage: float
    net_profit: float

class ExpirationRiskData(BaseModel):
    status: str
    value: float

class DashboardSnapshot(BaseModel):
    kpis: List[KPIData]
    sales_trend: List[SalesChartData]
    category_distribution: List[CategoryDistribution]
    peak_hours: List[PeakHourData]
    top_profitable: List[TopProfitableProduct]
    expiration_risk: List[ExpirationRiskData]
