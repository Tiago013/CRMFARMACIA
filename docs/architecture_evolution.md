# Roadmap Evolutivo Arquitectónico: FarmaAI CRM

Este documento delinea la estrategia para escalar FarmaAI de un **Monolito Modular** altamente cohesivo hacia una arquitectura de **Microservicios** distribuida, orientada a eventos (Event-Driven Architecture) y altamente resiliente, soportando operaciones farmacéuticas multi-tenant a nivel empresarial.

## 1. Estado Actual (Monolito Modular)
- **Frameworks:** FastAPI (Backend) + Next.js (Frontend).
- **Comunicación Interna:** Llamadas directas a funciones/servicios entre módulos (`app.modules.sales` -> `app.modules.inventory`).
- **Data Store:** Base de datos única en PostgreSQL (con aislamiento lógico de Tenants) + Redis para caché.
- **Resiliencia Básica:** Circuit Breakers en capa de aplicación (`app.core.circuit_breaker`) y logs estructurados.
- **Asincronismo:** Uso de `EventBus` en memoria (`app.core.events.py`) para emular paso de mensajes.

## 2. Fase de Transición (Scale-Out & Read Replicas)
Antes de romper el monolito, escalaremos horizontalmente la infraestructura:
- **Base de Datos:** Implementación de Read Replicas en PostgreSQL (AWS RDS Multi-AZ). El tráfico de lectura de Analytics/Forecasting se desviará a la réplica para no penalizar el motor transaccional del POS.
- **Caching Distribuido:** Migración de la caché en memoria y locks distribuidos a un clúster AWS ElastiCache for Redis más robusto.
- **Message Broker:** Sustitución del `EventBus` en memoria por **AWS SQS / SNS** o **Apache Kafka**. Los Domain Events (`PatientCreated`, `OrderPlaced`) se publicarán en colas persistentes.

## 3. Desacoplamiento Hacia Microservicios
Una vez madurados los límites de contexto (Bounded Contexts), extraeremos los módulos más pesados o de diferente ciclo de vida:

### a) Servicio de IA y Forecasting (Python / Ray / GPU)
Extraer `app.modules.ai` y `app.modules.forecasting` a un clúster independiente en AWS ECS/EKS con acceso a instancias GPU para inferencia pesada (LLMs, Prophet/XGBoost).

### b) Servicio de Comunicaciones y Webhooks (Node.js / Go)
Extraer `app.modules.communications` para manejar alta concurrencia de Webhooks de WhatsApp, utilizando un lenguaje altamente concurrente si es necesario, o FastAPI con máxima optimización I/O.

### c) Core Transaccional (POS & Inventory)
Mantiene la base del monolito actual, enfocado estrictamente en ACID compliance, bloqueos optimistas y consistencia de stock.

## 4. Patrones de Resiliencia y Fallo
- **Distributed Tracing:** Implementación de OpenTelemetry / AWS X-Ray para trazar las peticiones a través de la red de microservicios.
- **Circuit Breaker Distribuido:** Uso de Envoy Proxy / AWS App Mesh para aplicar circuit breaking y retries a nivel de red, no de código.
- **Sagas / Outbox Pattern:** Para asegurar la consistencia eventual entre el servicio de Ventas y el de Inventario si se separan sus bases de datos.

## 5. Estrategia de Migración (Strangler Fig Pattern)
1. **Paso 1:** Interceptar el tráfico en el API Gateway (AWS API Gateway / CloudFront).
2. **Paso 2:** Enrutar un subconjunto de tráfico de un módulo (Ej. Communications) hacia el nuevo microservicio.
3. **Paso 3:** Dejar la implementación vieja en el monolito como código muerto (zombie code).
4. **Paso 4:** Eliminar el código del monolito cuando el microservicio alcance 100% de confiabilidad.
