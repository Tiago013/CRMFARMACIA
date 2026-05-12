from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CashFlowEntry(BaseModel):
    entry_type: str # "income" or "expense"
    amount: float
    category: str
    description: Optional[str] = None
    timestamp: datetime = datetime.utcnow()

class DailyCloseRequest(BaseModel):
    date: str
    expected_cash: float
    actual_cash: float
    discrepancy_reason: Optional[str] = None

class FinancialMetrics(BaseModel):
    total_revenue: float
    total_expenses: float
    net_profit: float
    profit_margin_percentage: float
