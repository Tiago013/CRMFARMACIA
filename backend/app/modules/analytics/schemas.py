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

class DashboardSnapshot(BaseModel):
    kpis: List[KPIData]
    sales_trend: List[SalesChartData]
    category_distribution: List[CategoryDistribution]
