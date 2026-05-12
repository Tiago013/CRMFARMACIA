import asyncio
import json
import redis.asyncio as redis
from redis.exceptions import ConnectionError
from typing import List

from app.core.config import settings
from app.modules.ai.schemas import AIProfileContext, ProductRecommendation, PatientInsight

class AIService:
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def _generate_hybrid_insights(self, patient_id: str) -> AIProfileContext:
        """
        Simula un motor de IA que combina reglas híbridas (Reglas duras + Inferencia LLM).
        En producción real, esto llamaría a `openai.ChatCompletion` o `google.generativeai`.
        """
        # Simulamos latencia de red de un LLM (Async inference)
        await asyncio.sleep(0.5)

        # MOCK: Resultados generados por la IA
        return AIProfileContext(
            patient_id=patient_id,
            churn_risk_score=0.15, # Bajo riesgo
            recommendations=[
                ProductRecommendation(
                    product_id="prod_vit_c",
                    product_name="Vitamina C + Zinc 1000mg",
                    reason="Compró antibióticos recientemente. Sugerir soporte inmunológico.",
                    confidence_score=0.89
                ),
                ProductRecommendation(
                    product_id="prod_probiotics",
                    product_name="Probióticos Flora Viva",
                    reason="Protección estomacal post-tratamiento amoxicilina.",
                    confidence_score=0.95
                )
            ],
            insights=[
                PatientInsight(
                    insight_type="refill_reminder",
                    description="El paciente probablemente se quede sin Losartán en 5 días.",
                    actionable_step="Ofrecer re-abastecimiento automático vía WhatsApp.",
                    priority="high"
                ),
                PatientInsight(
                    insight_type="upsell_opportunity",
                    description="Alta frecuencia de compra de analgésicos para migraña.",
                    actionable_step="Ofrecer pack mensual con descuento.",
                    priority="medium"
                )
            ]
        )

    async def get_patient_ai_context(self, patient_id: str) -> AIProfileContext:
        cache_key = f"ai:context:{patient_id}"
        
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                return AIProfileContext.model_validate_json(cached_data)
        except ConnectionError:
            pass

        # Generar nuevos insights si no hay caché
        context = await self._generate_hybrid_insights(patient_id)

        try:
            # Cachear inferencias IA por 24 horas (ahorro de costos de API LLM)
            await self.redis_client.setex(cache_key, 86400, context.model_dump_json())
        except ConnectionError:
            pass
            
        return context
