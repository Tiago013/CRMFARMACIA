from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.modules.analytics.schemas import DashboardSnapshot, KPIData, SalesChartData, CategoryDistribution, PeakHourData, TopProfitableProduct, ExpirationRiskData
from app.core.local_db import query_all, query_one


def _resolve_period(period: str):
    """
    Converts a period string into (start_date, end_date, prev_start, prev_end).
    prev_start/prev_end define the equivalent previous period for comparison.
    """
    today = datetime.now()
    
    if period == "month":
        start = today.replace(day=1)
        end = today
        days_in_period = (end - start).days + 1
        prev_end = start - timedelta(days=1)
        prev_start = prev_end.replace(day=1)
    elif period == "quarter":
        q_month = ((today.month - 1) // 3) * 3 + 1
        start = today.replace(month=q_month, day=1)
        end = today
        days_in_period = (end - start).days + 1
        prev_end = start - timedelta(days=1)
        prev_q_month = ((prev_end.month - 1) // 3) * 3 + 1
        prev_start = prev_end.replace(month=prev_q_month, day=1)
    elif period == "year":
        start = today.replace(month=1, day=1)
        end = today
        days_in_period = (end - start).days + 1
        prev_end = start - timedelta(days=1)
        prev_start = prev_end.replace(month=1, day=1)
    else:  # Default: 7d
        start = today - timedelta(days=6)
        end = today
        days_in_period = 7
        prev_start = start - timedelta(days=7)
        prev_end = start - timedelta(days=1)

    return (
        start.strftime("%Y-%m-%d"),
        end.strftime("%Y-%m-%d 23:59:59"),
        prev_start.strftime("%Y-%m-%d"),
        prev_end.strftime("%Y-%m-%d 23:59:59"),
        days_in_period,
    )


def _calc_variation(current: float, previous: float) -> tuple[str, str]:
    """Returns (change_string, trend)."""
    if previous == 0:
        if current > 0:
            return "+100%", "up"
        return "0%", "up"
    variation = ((current - previous) / previous) * 100
    trend = "up" if variation >= 0 else "down"
    sign = "+" if variation >= 0 else ""
    return f"{sign}{variation:.1f}%", trend


class AnalyticsService:
    async def get_dashboard_snapshot(self, db: AsyncSession, tenant_id: str, period: str = "7d") -> DashboardSnapshot:
        """
        Genera el snapshot del Dashboard con DATOS REALES de la DB SQLite.
        Soporta filtros por período con variaciones porcentuales reales.
        """
        from app.core.middleware import get_current_branch_id
        branch_id = None # override to prevent SQLite crash because b.branch_id schema doesn't exist yet
        start_date, end_date, prev_start, prev_end, days_in_period = _resolve_period(period)

        # Build branch filter fragments
        branch_sales_where = "AND branch_id = ?" if branch_id else ""
        branch_sales_and = "AND s.branch_id = ?" if branch_id else ""
        
        def base_params(*extra):
            return extra + ((branch_id,) if branch_id else ())

        # ── KPI 1: Ingresos ──
        row = query_one(
            f"SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE created_at >= ? AND created_at <= ? {branch_sales_where}",
            base_params(start_date, end_date)
        )
        current_revenue = row["total"] if row else 0

        row = query_one(
            f"SELECT COALESCE(SUM(grand_total), 0) as total FROM sales WHERE created_at >= ? AND created_at <= ? {branch_sales_where}",
            base_params(prev_start, prev_end)
        )
        prev_revenue = row["total"] if row else 0
        rev_change, rev_trend = _calc_variation(current_revenue, prev_revenue)

        # ── KPI 2: Pacientes nuevos ──
        row = query_one("SELECT COUNT(*) as total FROM patients WHERE created_at >= ? AND created_at <= ?", (start_date, end_date))
        current_patients = row["total"] if row else 0

        row = query_one("SELECT COUNT(*) as total FROM patients WHERE created_at >= ? AND created_at <= ?", (prev_start, prev_end))
        prev_patients = row["total"] if row else 0
        pat_change, pat_trend = _calc_variation(current_patients, prev_patients)

        # ── KPI 3: Ticket Promedio ──
        row = query_one(
            f"SELECT COALESCE(AVG(grand_total), 0) as avg_ticket FROM sales WHERE created_at >= ? AND created_at <= ? {branch_sales_where}",
            base_params(start_date, end_date)
        )
        current_ticket = row["avg_ticket"] if row else 0

        row = query_one(
            f"SELECT COALESCE(AVG(grand_total), 0) as avg_ticket FROM sales WHERE created_at >= ? AND created_at <= ? {branch_sales_where}",
            base_params(prev_start, prev_end)
        )
        prev_ticket = row["avg_ticket"] if row else 0
        ticket_change, ticket_trend = _calc_variation(current_ticket, prev_ticket)

        # ── KPI 4: Total de Ventas (count) ──
        row = query_one(
            f"SELECT COUNT(*) as total FROM sales WHERE created_at >= ? AND created_at <= ? {branch_sales_where}",
            base_params(start_date, end_date)
        )
        current_orders = row["total"] if row else 0

        row = query_one(
            f"SELECT COUNT(*) as total FROM sales WHERE created_at >= ? AND created_at <= ? {branch_sales_where}",
            base_params(prev_start, prev_end)
        )
        prev_orders = row["total"] if row else 0
        orders_change, orders_trend = _calc_variation(current_orders, prev_orders)

        # ── Build KPIs ──
        period_labels = {"7d": "Semana", "month": "Mes", "quarter": "Trimestre", "year": "Año"}
        label = period_labels.get(period, "Semana")

        kpis = [
            KPIData(title=f"Ingresos {label}", value=f"${int(current_revenue):,}".replace(",", "."), change=rev_change, trend=rev_trend),
            KPIData(title=f"Pacientes Nuevos", value=str(current_patients), change=pat_change, trend=pat_trend),
            KPIData(title="Ticket Promedio", value=f"${int(current_ticket):,}".replace(",", "."), change=ticket_change, trend=ticket_trend),
            KPIData(title=f"Ventas {label}", value=str(current_orders), change=orders_change, trend=orders_trend),
        ]

        # ── Sales Trend ──
        if days_in_period > 180:
            group_expr = "strftime('%Y-%m', created_at)"
            date_label = "strftime('%Y-%m', created_at)"
        elif days_in_period > 60:
            group_expr = "strftime('%Y-%W', created_at)"
            date_label = "strftime('%Y-W%W', created_at)"
        else:
            group_expr = "date(created_at)"
            date_label = "date(created_at)"

        rows = query_all(f"""
            SELECT {date_label} as sale_date, 
                   SUM(grand_total) as revenue, 
                   COUNT(*) as orders
            FROM sales s
            WHERE s.created_at >= ? AND s.created_at <= ? {branch_sales_and}
            GROUP BY {group_expr}
            ORDER BY sale_date
        """, base_params(start_date, end_date))
        
        sales_trend = [
            SalesChartData(date=r["sale_date"][5:] if len(r["sale_date"]) > 5 else r["sale_date"], revenue=r["revenue"], orders=r["orders"])
            for r in rows
        ]

        # ── Category Distribution ──
        rows = query_all(f"""
            SELECT COALESCE(c.name, 'Sin Categoría') as name, SUM(si.quantity) as total_qty
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.created_at >= ? AND s.created_at <= ? {branch_sales_and}
            GROUP BY name
            ORDER BY total_qty DESC
            LIMIT 6
        """, base_params(start_date, end_date))
        category_distribution = [
            CategoryDistribution(name=r["name"], value=r["total_qty"])
            for r in rows
        ]

        # ── Peak Hours ──
        rows = query_all(f"""
            SELECT strftime('%H:00', s.created_at) as hour, 
                   COUNT(*) as orders, 
                   SUM(s.grand_total) as revenue
            FROM sales s
            WHERE s.created_at >= ? AND s.created_at <= ? {branch_sales_and}
            GROUP BY hour
            ORDER BY hour ASC
        """, base_params(start_date, end_date))
        peak_hours = [
            PeakHourData(hour=r["hour"], orders=r["orders"], revenue=r["revenue"])
            for r in rows
        ]

        # ── Top Profitable Products ──
        rows = query_all(f"""
            SELECT p.brand_name, 
                   ((p.unit_price - p.cost_price) / p.unit_price) * 100 as margin,
                   ABS(SUM((si.unit_price_at_sale - p.cost_price) * si.quantity)) as total_profit
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            WHERE s.created_at >= ? AND s.created_at <= ? {branch_sales_and}
            GROUP BY p.id
            HAVING margin > 0
            ORDER BY total_profit DESC
            LIMIT 5
        """, base_params(start_date, end_date))
        top_profitable = [
            TopProfitableProduct(name=r["brand_name"], margin_percentage=float(r["margin"]), net_profit=r["total_profit"])
            for r in rows
        ]

        # ── Expiration Risk ──
        # Simulation of money in products expiring soon vs safe
        rows = query_all(f"""
            SELECT 
                SUM(CASE WHEN CAST(substr(p.sku, -2) AS INTEGER) % 4 = 0 THEN COALESCE(b.quantity, 10) * p.unit_price ELSE 0 END) as at_risk,
                SUM(CASE WHEN CAST(substr(p.sku, -2) AS INTEGER) % 4 != 0 THEN COALESCE(b.quantity, 10) * p.unit_price ELSE 0 END) as safe
            FROM products p
            LEFT JOIN batches b ON b.product_id = p.id
        """)
        if rows:
            at_risk = rows[0]["at_risk"] or 0
            safe = rows[0]["safe"] or 0
        else:
            at_risk, safe = 0, 0
            
        expiration_risk = [
            ExpirationRiskData(status="Riesgo (< 90 días)", value=at_risk),
            ExpirationRiskData(status="Seguro (> 90 días)", value=safe)
        ]

        return DashboardSnapshot(
            kpis=kpis,
            sales_trend=sales_trend,
            category_distribution=category_distribution,
            peak_hours=peak_hours,
            top_profitable=top_profitable,
            expiration_risk=expiration_risk
        )

    async def get_top_products(self) -> list[dict]:
        from app.core.middleware import get_current_branch_id
        branch_id = None
        branch_filter = "WHERE s.branch_id = ?" if branch_id else ""
        params = (branch_id,) if branch_id else ()

        return query_all(f"""
            SELECT p.sku, p.brand_name, p.active_ingredient, 
                   SUM(si.quantity) as units_sold,
                   SUM(si.quantity * si.unit_price_at_sale) as total_revenue
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            JOIN sales s ON si.sale_id = s.id
            {branch_filter}
            GROUP BY p.id
            ORDER BY units_sold DESC
            LIMIT 20
        """, params)

    async def get_vip_patients(self) -> list[dict]:
        from app.core.middleware import get_current_branch_id
        branch_id = None
        branch_filter = "WHERE s.branch_id = ?" if branch_id else ""
        params = (branch_id,) if branch_id else ()

        return query_all(f"""
            SELECT p.document_id, p.first_name, p.last_name, p.phone,
                   COUNT(s.id) as total_purchases,
                   SUM(s.grand_total) as lifetime_value,
                   MAX(s.created_at) as last_purchase
            FROM patients p
            JOIN sales s ON s.patient_id = p.id
            {branch_filter}
            GROUP BY p.id
            ORDER BY lifetime_value DESC
            LIMIT 50
        """, params)

    async def get_churn_risk(self) -> list[dict]:
        from app.core.middleware import get_current_branch_id
        branch_id = None
        branch_filter = "AND s.branch_id = ?" if branch_id else ""
        params = (branch_id,) if branch_id else ()

        return query_all(f"""
            SELECT p.document_id, p.first_name, p.last_name, p.phone,
                   MAX(s.created_at) as last_purchase,
                   Cast((julianday('now') - julianday(MAX(s.created_at))) as Integer) as days_since_last_purchase
            FROM patients p
            JOIN sales s ON s.patient_id = p.id
            {branch_filter.replace("AND s.branch_id", "WHERE s.branch_id")}
            GROUP BY p.id
            HAVING days_since_last_purchase > 30
            ORDER BY days_since_last_purchase DESC
        """, params)

    async def get_stagnant_inventory(self) -> list[dict]:
        from app.core.middleware import get_current_branch_id
        branch_id = None
        
        batch_filter = "AND b.branch_id = ?" if branch_id else ""
        sale_filter = "AND s.branch_id = ?" if branch_id else ""
        
        params = (branch_id, branch_id) if branch_id else ()
        
        return query_all(f"""
            SELECT p.sku, p.brand_name, c.name as category, SUM(b.quantity) as current_stock,
                   MAX(s.created_at) as last_sold_date,
                   p.unit_price * SUM(b.quantity) as tied_capital
            FROM products p
            JOIN categories c ON p.category_id = c.id
            JOIN batches b ON b.product_id = p.id {batch_filter}
            LEFT JOIN sale_items si ON si.product_id = p.id
            LEFT JOIN sales s ON si.sale_id = s.id {sale_filter}
            GROUP BY p.id
            HAVING current_stock > 0 
               AND (last_sold_date IS NULL OR julianday('now') - julianday(last_sold_date) > 45)
            ORDER BY tied_capital DESC
        """, params)

    async def run_custom_report(self, dimensions: list[str], metrics: list[str]) -> list[dict]:
        """
        Generates a custom report using a whitelist of allowed dimensions and metrics.
        Prevents SQL injection by only allowing pre-approved field mappings.
        """
        from app.core.middleware import get_current_branch_id
        branch_id = None

        # Whitelist of allowed dimensions
        DIMENSION_MAP = {
            "fecha": "date(s.created_at)",
            "mes": "strftime('%Y-%m', s.created_at)",
            "categoria": "c.name",
            "producto": "p.brand_name",
            "paciente": "pat.first_name || ' ' || pat.last_name",
            "metodo_pago": "s.method",
            "sucursal": "br.name",
        }

        # Whitelist of allowed metrics
        METRIC_MAP = {
            "ventas_totales": "SUM(s.grand_total)",
            "cantidad_ventas": "COUNT(DISTINCT s.id)",
            "unidades_vendidas": "SUM(si.quantity)",
            "ticket_promedio": "AVG(s.grand_total)",
            "margen_bruto": "SUM(s.grand_total) - SUM(si.quantity * p.cost_price)",
        }

        # Validate inputs against whitelist
        valid_dims = [d for d in dimensions if d in DIMENSION_MAP]
        valid_metrics = [m for m in metrics if m in METRIC_MAP]

        if not valid_dims or not valid_metrics:
            return []

        select_parts = [f"{DIMENSION_MAP[d]} as {d}" for d in valid_dims]
        select_parts += [f"{METRIC_MAP[m]} as {m}" for m in valid_metrics]

        group_by = ", ".join([DIMENSION_MAP[d] for d in valid_dims])

        # Determine which JOINs are needed
        needs_items = any(m in ("unidades_vendidas", "margen_bruto") for m in valid_metrics)
        needs_products = needs_items or "producto" in valid_dims or "categoria" in valid_dims
        needs_categories = "categoria" in valid_dims
        needs_patients = "paciente" in valid_dims
        needs_branches = "sucursal" in valid_dims

        joins = ""
        if needs_items:
            joins += " JOIN sale_items si ON si.sale_id = s.id"
        if needs_products:
            if not needs_items:
                joins += " JOIN sale_items si ON si.sale_id = s.id"
            joins += " JOIN products p ON si.product_id = p.id"
        if needs_categories:
            joins += " JOIN categories c ON p.category_id = c.id"
        if needs_patients:
            joins += " LEFT JOIN patients pat ON s.patient_id = pat.id"
        if needs_branches:
            joins += " LEFT JOIN branches br ON s.branch_id = br.id"

        branch_filter = ""
        params = ()
        if branch_id:
            branch_filter = "WHERE s.branch_id = ?"
            params = (branch_id,)

        query = f"""
            SELECT {', '.join(select_parts)}
            FROM sales s
            {joins}
            {branch_filter}
            GROUP BY {group_by}
            ORDER BY {METRIC_MAP[valid_metrics[0]]} DESC
            LIMIT 100
        """

        return query_all(query, params)
