from datetime import datetime, timedelta
import random
from app.modules.forecasting.schemas import ForecastResponse, DataPoint, CustomerScore

class ForecastingService:
    def get_demand_forecast(self, product_id: str = "ALL") -> ForecastResponse:
        """
        Simula una predicción de demanda estilo Meta Prophet.
        Genera datos históricos (30 días) y predicción (15 días).
        """
        today = datetime.now()
        
        hist_data = []
        base_val = 100
        for i in range(30, 0, -1):
            date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            val = base_val + random.uniform(-20, 20)
            # Simular una anomalía hace 5 días
            if i == 5:
                val += 80 
            hist_data.append(DataPoint(date=date_str, value=val))
            base_val += random.uniform(-2, 3)

        forecast_data = []
        for i in range(1, 16):
            date_str = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            val = base_val + random.uniform(-10, 15)
            # Prophet bands
            lower = val * 0.85
            upper = val * 1.15
            forecast_data.append(DataPoint(date=date_str, value=val, lower_bound=lower, upper_bound=upper))
            base_val += random.uniform(-1, 4)
            
        return ForecastResponse(
            product_id=product_id,
            product_name="Agregado Global (Todos los productos)" if product_id == "ALL" else f"Producto {product_id}",
            historical_data=hist_data,
            forecast_data=forecast_data,
            confidence_level=0.89,
            anomaly_detected=True,
            explanation="Se detectó un pico inusual de demanda hace 5 días, correlacionado con factores estacionales. El modelo Prophet prevé una tendencia al alza del 12% para las próximas dos semanas."
        )

    def get_customer_scoring(self, patient_id: str) -> CustomerScore:
        """
        Devuelve el scoring predictivo de un cliente usando modelos de ML simulados.
        """
        return CustomerScore(
            patient_id=patient_id,
            ltv_prediction=random.uniform(500, 2500),
            churn_probability=random.uniform(0.05, 0.45),
            next_purchase_days=random.randint(5, 45),
            segment="High Value" if random.random() > 0.5 else "At Risk"
        )
