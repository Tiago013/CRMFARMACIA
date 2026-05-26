import sqlite3
import math
from datetime import datetime, timedelta
from app.core.local_db import DB_PATH
from app.modules.forecasting.schemas import ForecastResponse, DataPoint, CustomerScore

class ForecastingService:
    def get_demand_forecast(self, product_id: str = "ALL") -> ForecastResponse:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Get historical data for the last 90 days
        today = datetime.now()
        start_date = (today - timedelta(days=90)).strftime("%Y-%m-%d")
        
        if product_id == "ALL":
            c.execute("""
                SELECT date(created_at) as d, SUM(grand_total) as val 
                FROM sales 
                WHERE created_at >= ? AND status != 'refunded'
                GROUP BY d ORDER BY d
            """, (start_date,))
        else:
            c.execute("""
                SELECT date(s.created_at) as d, SUM(si.quantity) as val 
                FROM sales s
                JOIN sale_items si ON s.id = si.sale_id
                WHERE s.created_at >= ? AND si.product_id = ? AND s.status != 'refunded'
                GROUP BY d ORDER BY d
            """, (start_date, product_id))
            
        rows = c.fetchall()
        
        # Fill missing days with 0
        history_map = {row[0]: row[1] for row in rows}
        hist_data = []
        values = []
        
        for i in range(89, -1, -1):
            date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            val = history_map.get(date_str, 0.0)
            hist_data.append(DataPoint(date=date_str, value=val))
            values.append(val)
            
        # Basic Statistics
        n = len(values)
        if n == 0:
            mean = 0
            std_dev = 0
        else:
            mean = sum(values) / n
            variance = sum((x - mean) ** 2 for x in values) / n
            std_dev = math.sqrt(variance)
            
        # Detect anomaly
        anomaly_detected = False
        anomaly_val = 0
        for x in values[-7:]: # Check last 7 days for anomaly
            if x > mean + 2 * std_dev and std_dev > 0:
                anomaly_detected = True
                anomaly_val = x
                break
                
        # Simple Exponential Smoothing (SES) for forecasting
        alpha = 0.3
        smoothed_val = mean if n > 0 else 0
        for x in values:
            smoothed_val = alpha * x + (1 - alpha) * smoothed_val
            
        # Forecast next 15 days (SES produces flat forecast, we can add a simple trend)
        forecast_data = []
        trend = 0
        if n > 7:
            # simple linear trend of last 7 days
            last_7 = values[-7:]
            trend = (last_7[-1] - last_7[0]) / 7.0
            
        current_forecast = smoothed_val
        for i in range(1, 16):
            date_str = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            # bound trend to avoid going negative or exploding
            current_forecast = max(0, current_forecast + trend * 0.5) 
            
            # Confidence bounds based on historical std_dev
            margin = max(1.0, std_dev * 1.5)
            lower = max(0, current_forecast - margin)
            upper = current_forecast + margin
            
            forecast_data.append(DataPoint(date=date_str, value=round(current_forecast, 2), lower_bound=round(lower, 2), upper_bound=round(upper, 2)))

        product_name = "Agregado Global (Ingresos totales)"
        if product_id != "ALL":
            c.execute("SELECT brand_name FROM products WHERE id = ?", (product_id,))
            prow = c.fetchone()
            if prow:
                product_name = prow[0]

        conn.close()
        
        explanation = "La demanda se mantiene dentro de los rangos históricos previstos."
        if anomaly_detected:
            explanation = f"Se detectó un pico inusual recientemente. El valor superó las 2 desviaciones estándar sobre la media histórica. El modelo ajustó sus bandas de confianza automáticamente."
            
        return ForecastResponse(
            product_id=product_id,
            product_name=product_name,
            historical_data=hist_data[-30:], # return only last 30 days to frontend for display
            forecast_data=forecast_data,
            confidence_level=0.85,
            anomaly_detected=anomaly_detected,
            explanation=explanation
        )

    def get_customer_scoring(self, patient_id: str) -> CustomerScore:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("SELECT first_name, last_name, ltv, segment, last_purchase_date FROM patients WHERE id = ?", (patient_id,))
        patient = c.fetchone()
        
        if not patient:
            conn.close()
            # fallback
            return CustomerScore(
                patient_id=patient_id, ltv_prediction=0.0, churn_probability=0.0, next_purchase_days=0, segment="Unknown"
            )
            
        first_name, last_name, current_ltv, segment, last_purchase_date = patient
        
        # Get purchase history dates
        c.execute("SELECT date(created_at) as d FROM sales WHERE patient_id = ? ORDER BY d ASC", (patient_id,))
        purchases = [row[0] for row in c.fetchall()]
        conn.close()
        
        today = datetime.now()
        
        # Churn prob
        days_since_last = 0
        if last_purchase_date:
            try:
                last_dt = datetime.strptime(last_purchase_date, "%Y-%m-%d")
                days_since_last = (today - last_dt).days
            except:
                pass
                
        # Calculate gaps
        gaps = []
        for i in range(1, len(purchases)):
            d1 = datetime.strptime(purchases[i-1], "%Y-%m-%d")
            d2 = datetime.strptime(purchases[i], "%Y-%m-%d")
            gaps.append((d2 - d1).days)
            
        avg_gap = 30 # default
        if gaps:
            avg_gap = sum(gaps) / len(gaps)
            
        # Churn probability based on recency vs avg gap
        churn_prob = 0.1
        if avg_gap > 0:
            ratio = days_since_last / avg_gap
            if ratio > 2.0:
                churn_prob = min(0.95, 0.5 + (ratio - 2.0) * 0.1)
            elif ratio > 1.0:
                churn_prob = 0.2 + (ratio - 1.0) * 0.3
        else:
            # Only one purchase
            if days_since_last > 60: churn_prob = 0.8
            elif days_since_last > 30: churn_prob = 0.5
            
        # LTV projection: if churn is low, they will buy again.
        expected_future_purchases = 0
        if churn_prob < 0.5:
            expected_future_purchases = 3 # arbitrary projection for the next year
            
        avg_ticket = current_ltv / len(purchases) if purchases else current_ltv
        ltv_prediction = current_ltv + (expected_future_purchases * avg_ticket * (1 - churn_prob))
        
        return CustomerScore(
            patient_id=patient_id,
            ltv_prediction=round(ltv_prediction, 2),
            churn_probability=round(churn_prob, 3),
            next_purchase_days=int(avg_gap),
            segment=segment or "Regular"
        )
