// Graba el video de 2 minutos de la demo (docs/guion-video.md) con subtítulos
// en pantalla, recorriendo la demo pública como un visitante.
//
//   node scripts/grabar-video.mjs [carpeta-de-salida]
//
// Captura la pantalla con el screencast del navegador (cuadros con su hora) y
// arma farmaai-demo.mp4 con el ffmpeg del sistema (debe estar en el PATH).
// Hace una venta real en la farmacia demo, que se restaura cada noche.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = process.env.DEMO_URL ?? 'https://crmfarmacia.vercel.app';
const OUT = resolve(process.argv[2] ?? 'video');
const SIZE = { width: 1440, height: 900 };
const FRAMES = join(OUT, 'frames');
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Subtítulo fijo abajo, por encima de la app; se vuelve a poner tras cada navegación
async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('__caption');
    if (!el) {
      el = document.createElement('div');
      el.id = '__caption';
      Object.assign(el.style, {
        position: 'fixed', left: '50%', bottom: '28px', transform: 'translateX(-50%)', zIndex: '2147483647',
        maxWidth: '1100px', padding: '14px 24px', borderRadius: '12px', background: 'rgba(15,16,28,0.88)',
        color: '#F5F5F7', font: '500 24px/1.35 system-ui, Segoe UI, sans-serif', textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)', pointerEvents: 'none', transition: 'opacity 200ms',
      });
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

// Resalta lo que se va a tocar (el video no muestra el puntero)
async function point(locator, ms = 700) {
  await locator.evaluate((el) => {
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.style.outline = '3px solid #818CF8';
    el.style.outlineOffset = '3px';
  });
  await wait(ms);
  await locator.evaluate((el) => { el.style.outline = ''; el.style.outlineOffset = ''; });
}

async function click(locator) {
  await point(locator);
  await locator.click();
}

// CHROME_PATH: usar un Chromium ya instalado si el de Playwright no coincide
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const context = await browser.newContext({
  viewport: SIZE,
  colorScheme: 'dark',
  locale: 'es-CO',
  timezoneId: 'America/Bogota',
});
const page = await context.newPage();

// Cada cuadro del screencast se guarda con su hora; ffmpeg respeta esas duraciones
const frames = [];
const cdp = await context.newCDPSession(page);
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = `f${String(frames.length).padStart(5, '0')}.jpg`;
  writeFileSync(join(FRAMES, file), Buffer.from(data, 'base64'));
  frames.push({ file, ts: metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
const screencast = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: SIZE.width, maxHeight: SIZE.height }).catch(() => {});
await screencast();
// Tras una navegación el navegador puede dejar de mandar cuadros (el video queda
// congelado en el primero): al terminar de cargar cada página se reinicia
const restart = () => cdp.send('Page.stopScreencast').catch(() => {}).then(screencast);
page.on('framenavigated', (f) => { if (f === page.mainFrame()) screencast(); });
page.on('load', restart);

try {
  // 0:00 Página de inicio
  await page.goto(BASE);
  await caption(page, 'Las droguerías de barrio pierden plata por medicamentos que se vencen, cajas que no cuadran y pacientes crónicos que dejan de volver.');
  await wait(5000);
  await page.evaluate(() => document.getElementById('problemas')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await caption(page, 'FarmaAI junta todo eso en una sola app web.');
  await wait(4500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await wait(1200);

  // 0:12 Entrar a la demo
  await caption(page, 'Se entra sin registrarse, como cajero, con datos ficticios que se restauran cada noche.');
  await click(page.getByRole('link', { name: 'Probar la demo' }));
  await page.waitForURL(/\/crm/, { timeout: 45_000 });
  const tour = page.getByRole('dialog', { name: 'Recorrido guiado' });
  await tour.waitFor({ timeout: 20_000 });
  await wait(1500);
  await tour.getByRole('button', { name: 'Cerrar recorrido' }).click();

  // 0:18 Pacientes
  await page.getByPlaceholder('Buscar paciente o etiqueta...').fill('Laura');
  await wait(800);
  await click(page.getByText('Laura Rodríguez').first());
  await caption(page, 'Cada paciente tiene su ficha: compras, gasto, adherencia y alergias.');
  await wait(3500);
  await caption(page, 'La IA sugiere productos con stock. Laura es alérgica a los antiinflamatorios, así que nunca le recomienda uno (probado en 50 casos).');
  await click(page.getByRole('button', { name: /Generar Recomendaciones/ }));
  // La evidencia dice cuántos productos se excluyeron por la alergia
  await page.getByText(/productos excluidos/).first().waitFor({ timeout: 40_000 });
  await wait(6000);

  // 0:38 Punto de venta
  await page.goto(`${BASE}/sales`);
  await caption(page, 'Vender es rápido: F4 para elegir el paciente, se agregan productos y se cobra.');
  const abrir = page.getByRole('button', { name: /Realizar Apertura de Caja/ });
  const abierta = page.getByRole('button', { name: /Caja Abierta/ });
  await abrir.or(abierta).waitFor({ timeout: 30_000 });
  if (await abrir.isVisible()) {
    await click(abrir);
    await page.getByRole('button', { name: 'Confirmar Apertura' }).click();
    await wait(1500);
  }
  await page.keyboard.press('F4');
  await page.getByPlaceholder(/Buscar por nombre o c[eé]dula/).fill('Laura');
  await wait(800);
  await click(page.getByText('Laura Rodríguez').last());
  await wait(800);
  const vendibles = page.getByRole('button', { name: /Stock:/ }).filter({ hasNotText: /VENCIDO/ });
  await click(vendibles.nth(1));
  await click(vendibles.nth(4));
  await caption(page, 'El servidor recalcula el total con los precios de la base, y descuenta del lote que vence primero.');
  await wait(2500);
  await click(page.getByRole('button', { name: /COBRAR/ }));
  await click(page.getByRole('button', { name: /Tarjeta/ }));
  await click(page.getByRole('button', { name: /CONFIRMAR PAGO/ }));
  await page.getByText(/Venta Procesada/).waitFor({ timeout: 30_000 });
  await wait(3500);

  // 1:00 WhatsApp
  await page.goto(`${BASE}/whatsapp`);
  await page.getByText('Últimos').waitFor({ timeout: 20_000 });
  await caption(page, 'Al cobrarle a un paciente se arma su recibo por WhatsApp. En la demo no sale nada: queda en esta bandeja.');
  await wait(9000);

  // 1:10 Inventario
  await page.goto(`${BASE}/inventory`);
  await page.getByPlaceholder('Buscar producto o lote...').waitFor({ timeout: 20_000 });
  await page.getByText('Cargando inventario...').waitFor({ state: 'hidden', timeout: 30_000 });
  await caption(page, 'El inventario va por lote y fecha de vencimiento: lo que está por vencer sale primero.');
  await wait(9500);

  // 1:22 Cierre del día
  await page.goto(`${BASE}/transactions?tab=cierre`);
  await page.getByText('Total vendido').waitFor({ timeout: 20_000 });
  await caption(page, 'Al final del día, el reporte Z: ventas, medios de pago y cuadre de caja, en Excel o PDF.');
  await wait(4000);
  await point(page.getByRole('button', { name: 'PDF' }), 1200);
  await caption(page, 'La venta de hace un momento ya está aquí.');
  await wait(6000);

  // 1:37 Dashboard
  await page.goto(`${BASE}/dashboard`);
  await page.getByText('Ingresos Totales', { exact: false }).first().waitFor({ timeout: 30_000 });
  await caption(page, 'El dashboard compara contra el periodo anterior con datos reales, no números de adorno.');
  await wait(3000);
  await page.locator('select').filter({ has: page.locator('option[value="year"]') }).selectOption('year');
  await wait(8000);

  // 1:50 Código
  await page.goto('https://github.com/Tiago013/CRMFARMACIA');
  await page.getByRole('heading', { name: /Caso de estudio/ }).first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await wait(1500);
  await caption(page, 'Detrás: 225 pruebas automáticas, una auditoría de seguridad documentada y las decisiones técnicas por escrito.');
  await wait(9000);
  await wait(500);
} finally {
  await cdp.send('Page.stopScreencast').catch(() => {});
  await context.close();
  await browser.close();
}

// Lista para ffmpeg: cada cuadro dura hasta el siguiente (el último, 2 s)
const list = frames.map((f, i) => {
  const next = frames[i + 1]?.ts ?? f.ts + 2;
  return `file '${f.file}'\nduration ${Math.max(0.001, next - f.ts).toFixed(3)}`;
});
list.push(`file '${frames.at(-1).file}'`);
writeFileSync(join(FRAMES, 'list.txt'), list.join('\n'));
const mp4 = join(OUT, 'farmaai-demo.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(FRAMES, 'list.txt'),
  '-vf', `scale=${SIZE.width}:${SIZE.height}:force_original_aspect_ratio=decrease,pad=${SIZE.width}:${SIZE.height}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,
  '-c:v', 'libx264', '-crf', '20', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
console.log(`Listo: ${mp4} (${frames.length} cuadros, ${(frames.at(-1).ts - frames[0].ts).toFixed(1)} s)`);
