# ADR 0004 · Demo pública en «modo demostración»: real donde importa, simulado donde cuesta

- **Estado:** aceptada
- **Fecha:** 2026-11 (fases 1 a 4 del plan de mejora)

## Contexto

La demo es pública: la abren reclutadores y docentes sin registrarse, y cualquiera puede vender,
borrar o desordenar datos. A la vez hay funciones que en producción tocarían el mundo real (enviar
WhatsApp, cobrar con tarjeta, gastar cuota de IA). Mostrar datos simulados en pantalla le quita
credibilidad; conectar servicios reales a una demo pública es riesgoso y caro.

## Decisión

La lógica de negocio es **la real** y solo se simula el último paso hacia afuera:

| Área | En la demo pública |
|---|---|
| Datos | Farmacia demo **separada** de la principal, con datos ficticios. Cada noche (3:00 a. m.) `demo_template.reset_demo()` la borra y la vuelve a copiar desde una foto, con IDs nuevos y fechas movidas a hoy. |
| Acceso | Tres cuentas públicas por rol; la de administrador es **de solo lectura** (el proxy rechaza toda escritura). |
| WhatsApp | El servidor arma el mensaje con la plantilla y los datos reales, pero **no lo envía**: queda en una bandeja marcada «Modo demo». En local, `WHATSAPP_MODE=local` lo envía de verdad. |
| IA | Clave de la aplicación con **cuota diaria por farmacia** (40) y respuesta de respaldo basada en reglas, marcada como tal. |
| Cobro de planes | Solo **diseño documentado** ([diseño de pagos](../diseno-pagos.md)), sin pasarela conectada. |
| Visitante | Franja «datos ficticios · se restauran cada noche» y recorrido guiado. |

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Datos simulados en el frontend | Rápido, pero un evaluador técnico lo detecta y deja de confiar en todo lo demás. |
| Demo sin restauración | Al primer visitante que borre datos, la demo queda rota para todos. |
| Servicios reales (WhatsApp, pasarela sandbox) | Llaves, webhooks y costos en una URL pública, sin aportar a lo que se evalúa. |
| Pedir registro | Un reclutador no se registra; se pierde la visita. |

## Consecuencias

- **+** Todo lo que se ve en pantalla sale de la base y de la misma lógica que usaría una farmacia real.
- **+** Romper la demo no tiene costo: se arregla sola cada noche.
- **−** Hay que mantener la foto `demo_template` cuando cambia el esquema (scripts en `prisma/sql/`).
- **−** Lo que se hace durante el día se pierde en la noche; está avisado en la franja superior.

## Dónde está

- `frontend/prisma/sql/02_demo_reset.sql` y `frontend/src/app/api/cron/reset-demo/route.ts`.
- `frontend/src/lib/roles.ts` (cuentas demo) y `frontend/src/utils/supabase/middleware.ts` (solo lectura).
- `frontend/src/lib/whatsapp/messages.ts` (modos demo/local).
- `frontend/src/app/api/ai/patient/[id]/route.ts` (cuota diaria).
