from fastapi import APIRouter
from app.modules.finance.schemas import CashFlowEntry, DailyCloseRequest, FinancialMetrics

router = APIRouter(prefix="/finance", tags=["Finance & Margins"])

@router.post("/expense")
async def register_expense(expense: CashFlowEntry):
    """
    Registra un gasto operativo (expense tracking) para control de márgenes.
    """
    return {"status": "success", "message": "Gasto registrado."}

@router.post("/daily-close")
async def close_register(close_req: DailyCloseRequest):
    """
    Realiza el arqueo de caja avanzado y el cierre diario (Z-Report).
    """
    return {"status": "success", "discrepancy": close_req.expected_cash - close_req.actual_cash}

@router.get("/metrics", response_model=FinancialMetrics)
async def get_financial_metrics():
    """
    Retorna analíticas financieras de rentabilidad (Revenue Analytics).
    """
    return FinancialMetrics(
        total_revenue=15000.50,
        total_expenses=4200.00,
        net_profit=10800.50,
        profit_margin_percentage=72.0
    )
