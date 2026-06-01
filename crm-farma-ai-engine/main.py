from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from prophet import Prophet
from typing import List

app = FastAPI(title="CRMFarmaIA Prediction Engine")

# Modelos de validación de datos
class SalesData(BaseModel):
    date: str
    value: float

class PredictionRequest(BaseModel):
    historical_data: List[SalesData]
    days_to_predict: int = 15

@app.post("/predict")
async def predict_demand(request: PredictionRequest):
    try:
        # 1. Convertir los datos JSON a un DataFrame de Pandas
        df = pd.DataFrame([vars(item) for item in request.historical_data])
        
        # Prophet requiere que las columnas se llamen 'ds' (fechas) e 'y' (valores)
        df = df.rename(columns={'date': 'ds', 'value': 'y'})
        df['ds'] = pd.to_datetime(df['ds'])

        # 2. Inicializar y entrenar el modelo de Prophet
        # (Se configura para ajustarse rápido a cambios diarios)
        model = Prophet(daily_seasonality=True, yearly_seasonality=False)
        model.fit(df)

        # 3. Crear el marco de tiempo futuro (15 días)
        future = model.make_future_dataframe(periods=request.days_to_predict)
        
        # 4. Generar la predicción
        forecast = model.predict(future)

        # 5. Extraer solo los días proyectados
        # Prophet devuelve historia + futuro. Filtramos solo el futuro.
        future_forecast = forecast.tail(request.days_to_predict)

        # Formatear la respuesta para el CRM
        predictions = []
        for index, row in future_forecast.iterrows():
            predictions.append({
                "date": row['ds'].strftime('%Y-%m-%d'),
                "value": max(0, round(row['yhat'])), # yhat es la predicción
                "lower_bound": max(0, round(row['yhat_lower'])),
                "upper_bound": round(row['yhat_upper'])
            })

        return {"predictions": predictions}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
