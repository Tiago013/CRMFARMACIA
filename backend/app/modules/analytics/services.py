from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
import json
import redis.asyncio as redis
from redis.exceptions import ConnectionError

from app.modules.analytics.schemas import DashboardSnapshot, KPIData, SalesChartData, CategoryDistribution
from app.core.config import settings

class AnalyticsService:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def get_dashboard_snapshot(self, db: AsyncSession, tenant_id: str) -> DashboardSnapshot:
        cache_key = f"analytics:snapshot:{tenant_id}:{datetime.now().strftime('%Y-%m-%d')}"
        
        try:
            # Intentar obtener de Redis (Cache)
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                return DashboardSnapshot.model_validate_json(cached_data)
        except ConnectionError:
            print("Redis no está disponible. Saltando caché...")

        # MOCK DATA para el Dashboard (MVP: Reemplazar con queries reales a PostgreSQL Materialized Views)
        # Esto simula un motor de métricas agregadas
        snapshot = DashboardSnapshot(
            kpis=[
                KPIData(title="Ingresos Hoy", value="$4,520.00", change="+12.5%", trend="up"),
                KPIData(title="Nuevos Pacientes", value="24", change="+4.2%", trend="up"),
                KPIData(title="Ticket Promedio", value="$45.50", change="-1.2%", trend="down"),
                KPIData(title="Órdenes", value="142", change="+8.1%", trend="up"),
            ],
            sales_trend=[
                SalesChartData(date=(datetime.now() - timedelta(days=i)).strftime("%b %d"), revenue=1200 + (i*150) % 500, orders=30 + i)
                for i in range(6, -1, -1)
            ],
            category_distribution=[
                CategoryDistribution(name="Analgésicos", value=45),
                CategoryDistribution(name="Antibióticos", value=25),
                CategoryDistribution(name="Vitaminas", value=20),
                CategoryDistribution(name="Cuidado Personal", value=10),
            ]
        )

        try:
            # Guardar en caché por 1 hora
            await self.redis_client.setex(cache_key, 3600, snapshot.model_dump_json())
        except ConnectionError:
            pass
        
        return snapshot
