# ADR 0003 · El servidor calcula el precio; el dinero se guarda exacto

- **Estado:** aceptada
- **Fecha:** 2026-11 (fases 1 y 2 del plan de mejora)

## Contexto

En la primera versión el punto de venta mandaba al servidor el total que calculaba el navegador, y
el servidor lo guardaba. Con las herramientas del navegador se podía cobrar cualquier precio. Además
los montos se guardaban como `Float`, que no representa bien los decimales (0,1 + 0,2 ≠ 0,3).

## Decisión

1. **Una sola función de precios, compartida.** `computeSaleTotals()` calcula líneas, descuentos e
   IVA. El POS la usa para mostrar el total y el servidor para cobrar: ambos dan el mismo número.
2. **El servidor usa sus propios precios.** El checkout ignora el precio que manda el navegador,
   lee `unit_price` de la base, valida cantidades y descuentos (`validateLine`) y recalcula.
3. **Si el total no coincide, no se cobra.** Con una diferencia de más de $1 frente a lo que vio el
   cajero, responde 409 («los precios cambiaron») en lugar de cobrar un monto distinto.
4. **Dinero en `NUMERIC(12,2)`** (Prisma `Decimal`), convertido a número en un solo punto
   (extensión de Prisma) y redondeado a centavos con `roundMoney()`.
5. **El IVA se calcula por línea y se suma**, de modo que los productos guardados suman exactamente
   el total de la venta, sin diferencias de centavos (corregido en el PR #29).

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Confiar en el total del cliente | Es la vulnerabilidad original. |
| Recalcular solo en el servidor, sin función compartida | El cajero vería un total y se cobraría otro. |
| Guardar centavos como enteros | Válido, pero `NUMERIC` es igual de exacto y más legible en reportes y SQL. |

## Consecuencias

- **+** No se puede manipular el precio y los reportes cuadran al centavo.
- **+** La función de precios es pura y está probada (incluidos descuentos del 100 % y redondeos).
- **−** Si cambia un precio mientras el cajero arma la venta, la venta se rechaza y hay que recargar.

## Dónde está

- `frontend/src/lib/pos/pricing.ts` y `tests/unit/pricing.test.ts`.
- `frontend/src/app/api/pos/checkout/route.ts`.
- `frontend/src/lib/decimal.ts`, `frontend/prisma/sql/01_money_decimal.sql`.
