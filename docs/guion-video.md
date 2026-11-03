# Guion del video (2 minutos)

Grabación de pantalla con voz, en la demo pública. Sigue el mismo orden que el recorrido guiado, así
quien vea el video y luego entre a la demo reconoce cada paso.

**Versión automática (sin voz, con subtítulos).** `npm run video -- <carpeta>` recorre la demo
pública con Playwright siguiendo esta tabla, pone el texto de «Qué decir» como subtítulo y arma
`farmaai-demo.mp4` con ffmpeg (debe estar instalado). Si el Chromium de Playwright no coincide con
su versión, `CHROME_PATH=<ruta a chrome>` usa otro.

**Antes de grabar** (versión con voz)

- Ventana del navegador a 1440×900, modo oscuro, zoom 100 %, sin otras pestañas a la vista.
- Sesión cerrada, para empezar en la página de inicio.
- Si la caja del punto de venta está cerrada, ábrela antes (o graba ese paso: suma unos 10 s).
- Ensaya una vez entera con cronómetro; el guion da ~2:00 a ritmo tranquilo.

| Tiempo | Pantalla | Qué hacer | Qué decir |
|---|---|---|---|
| 0:00–0:12 | Página de inicio | Quieto en el título; baja hasta «Tres problemas». | «Las droguerías de barrio pierden plata por medicamentos que se vencen, cajas que no cuadran y pacientes crónicos que dejan de volver. FarmaAI junta todo eso en una sola app web.» |
| 0:12–0:18 | Inicio → app | Clic en **Probar la demo**. | «Se entra sin registrarse, como cajero, con datos ficticios que se restauran cada noche.» |
| 0:18–0:38 | Pacientes | Abre a **Laura Rodríguez** → **Generar recomendaciones**. | «Cada paciente tiene su ficha: compras, gasto, adherencia y alergias. La IA sugiere productos con stock, y como Laura es alérgica a los antiinflamatorios, nunca le recomienda uno. Eso está probado en 50 casos.» |
| 0:38–1:00 | Punto de venta | **F4** → elige a Laura → agrega dos productos → **Cobrar** con tarjeta. | «Vender es rápido. El servidor recalcula el total con los precios de la base, así que nadie puede cambiarlo desde el navegador, y descuenta del lote que vence primero.» |
| 1:00–1:10 | WhatsApp | Abre la bandeja; señala el recibo «Simulado». | «Al cobrarle a un paciente se arma su recibo por WhatsApp. En la demo no sale nada: queda en esta bandeja.» |
| 1:10–1:22 | Inventario | Señala un lote «próximo a vencer». | «El inventario va por lote y fecha de vencimiento; lo que está por vencer sale primero.» |
| 1:22–1:37 | Ventas y Compras → Cierre del día (Z) | Muestra el total y los turnos; clic en **PDF**. | «Al final del día, el reporte Z: ventas, medios de pago y cuadre de la caja, en Excel o PDF. La venta de hace un momento ya está aquí.» |
| 1:37–1:50 | Dashboard | Cambia el periodo a **Año actual**. | «El dashboard compara contra el periodo anterior con datos reales, no números de adorno.» |
| 1:50–2:00 | GitHub (README) | Muestra el caso de estudio y las insignias. | «Detrás hay 225 pruebas automáticas, una auditoría de seguridad documentada y las decisiones técnicas por escrito. El enlace está en la descripción.» |

**Después de grabar**

- Sube el video (YouTube como «no listado», o Loom) y pega el enlace al inicio del README, debajo del
  enlace a la demo en vivo.
- Miniatura: la captura del dashboard (`docs/screenshots/dashboard.jpg`).
