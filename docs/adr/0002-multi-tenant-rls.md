# ADR 0002 · Multi-farmacia con `tenant_id` por fila y RLS como segunda barrera

- **Estado:** aceptada
- **Fecha:** 2026-11 (reforzada tras la auditoría de seguridad, PR #1)

## Contexto

FarmaAI es un SaaS: varias droguerías comparten la misma aplicación y la misma base de datos.
El riesgo principal es que una farmacia vea o modifique datos de otra. La primera versión confiaba
en un encabezado `X-Tenant-ID` que mandaba el navegador: cualquiera podía cambiarlo.

## Decisión

1. **Una base, una columna.** Todas las tablas de negocio llevan `tenant_id` (ver el
   [modelo de datos](../modelo-datos.md)).
2. **El tenant sale del servidor, nunca del cliente.** `requireAuth()` valida la sesión con
   `supabase.auth.getUser()` y lee el `tenant_id` del perfil en la base. Solo un superadmin puede
   actuar sobre otra farmacia (suplantación con cookie httpOnly, para soporte).
3. **Cada consulta filtra por tenant**, y las rutas `/[id]` verifican que el registro sea de esa
   farmacia antes de leerlo o modificarlo.
4. **RLS activado en todas las tablas, sin políticas.** La API REST pública de Supabase (claves
   `anon` / `authenticated`) no puede leer ni escribir nada. La app usa Prisma con el rol dueño de
   las tablas, así que RLS no la afecta: es defensa en profundidad por si alguien usa la clave pública.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Un esquema de Postgres por farmacia | Migraciones × N, conexiones × N; demasiado para un SaaS que empieza. |
| Una base por farmacia | Aislamiento máximo, pero costo y operación imposibles en plan gratuito. |
| Políticas RLS por tenant con el JWT del usuario | Lo ideal a futuro, pero exige que todas las consultas pasen por el rol del usuario y no por Prisma con conexión directa. |

## Consecuencias

- **+** Barato y simple: una sola migración, un solo pool de conexiones.
- **+** El aislamiento se prueba en un solo lugar (`requireAuth`) y la farmacia demo está separada
  de la principal con el mismo mecanismo.
- **−** El aislamiento depende de que **cada** consulta filtre bien; un `findMany` sin `tenant_id`
  sería una fuga. Se mitiga con revisión de código y con el helper obligatorio.
- **−** Supabase Realtime desde el navegador no se puede usar mientras no haya políticas por
  tenant (queda en «Trabajo futuro»).

## Dónde está

- `frontend/src/lib/auth.ts` (`requireAuth`) y `tests/unit/auth.test.ts`.
- `frontend/src/utils/supabase/middleware.ts` (sesión obligatoria en `/api`).
- `frontend/prisma/enable_rls.sql`.
