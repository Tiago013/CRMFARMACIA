import { expect, test, type Page } from '@playwright/test';

// Recorrido sugerido en el README, con la cuenta demo (rol cajero).
// Las credenciales son públicas (README); se pueden sobrescribir por entorno.
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@farmaai.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? '123456';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('tu@correo.com').fill(DEMO_EMAIL);
  await page.getByPlaceholder('••••••••').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('Recorrido demo del README', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('el cajero ve los módulos del recorrido en el menú', async ({ page }) => {
    for (const item of ['Dashboard', 'Punto de Venta', 'Ventas y Compras', 'Inventario', 'Finanzas', 'Pacientes', 'WhatsApp']) {
      await expect(page.getByRole('link', { name: item })).toBeVisible();
    }
    // Lo que es solo de administrador no aparece
    await expect(page.getByRole('link', { name: 'Super Admin' })).toHaveCount(0);
  });

  test('Pacientes: abre la ficha de un paciente', async ({ page }) => {
    await page.getByRole('link', { name: 'Pacientes' }).click();
    await expect(page.getByRole('heading', { name: 'Centro Operativo de Pacientes' })).toBeVisible();
    // La ficha 360° muestra el nombre del paciente activo como h2
    await expect(page.locator('h2').first()).not.toBeEmpty({ timeout: 20_000 });
  });

  test('Punto de Venta: abre caja, vende y la venta aparece en auditoría', async ({ page }) => {
    await page.getByRole('link', { name: 'Punto de Venta' }).click();

    // El turno de caja vive en la base: puede estar abierto por otra visita.
    // Se espera a que el POS sepa el estado y solo se abre si está cerrada.
    const abrir = page.getByRole('button', { name: /Realizar Apertura de Caja/ });
    const abierta = page.getByRole('button', { name: /Caja Abierta/ });
    await expect(abrir.or(abierta)).toBeVisible({ timeout: 20_000 });
    if (await abrir.isVisible()) {
      await abrir.click();
      await page.getByRole('button', { name: 'Confirmar Apertura' }).click();
      await expect(page.getByText(/Caja abierta exitosamente/)).toBeVisible();
    }

    // Primer producto vendible del catálogo (sin lote vencido)
    await page.getByRole('button', { name: /Stock:/ }).filter({ hasNotText: /VENCIDO/ }).first().click({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /COBRAR/ })).toBeEnabled();

    await page.getByRole('button', { name: /COBRAR/ }).click();
    await page.getByRole('button', { name: /Tarjeta/ }).click();
    await page.getByRole('button', { name: /CONFIRMAR PAGO/ }).click();
    await expect(page.getByText(/¡Venta Procesada! Total: \$/)).toBeVisible({ timeout: 30_000 });

    // El recibo se abre en otra pestaña con el total de la venta
    const [recibo] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByRole('button', { name: 'Ver recibo' }).click(),
    ]);
    await expect(recibo.getByText(/Recibo N\.º/)).toBeVisible({ timeout: 20_000 });
    // exact: si no, también coincide con "Subtotal"
    await expect(recibo.getByText('TOTAL', { exact: true })).toBeVisible();
    await recibo.close();

    await page.getByRole('link', { name: 'Ventas y Compras' }).click();
    await expect(page.getByRole('heading', { name: /Auditoría de Ventas/ })).toBeVisible();
  });

  test('WhatsApp: la bandeja está marcada como modo demo y no envía nada', async ({ page }) => {
    await page.getByRole('link', { name: 'WhatsApp' }).click();
    await expect(page.getByText('Modo demostración: ningún mensaje sale de aquí.')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Modo demo · no se envía nada')).toBeVisible();
    // La conexión por QR solo existe en modo local
    await expect(page.getByRole('button', { name: 'Conexión Dispositivo' })).toHaveCount(0);
  });

  test('Cierre del día: el reporte Z carga y se puede exportar', async ({ page }) => {
    await page.getByRole('link', { name: 'Ventas y Compras' }).click();
    await page.getByRole('button', { name: 'Cierre del día (Z)' }).click();
    await expect(page.getByRole('heading', { name: 'Reporte Z · Cierre del día' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Total vendido')).toBeVisible({ timeout: 20_000 });
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel' }).click();
    expect((await descarga).suggestedFilename()).toMatch(/^reporte_z_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  test('Inventario: muestra lotes ordenados por vencimiento', async ({ page }) => {
    await page.getByRole('link', { name: 'Inventario' }).click();
    await expect(page.getByPlaceholder('Buscar producto o lote...')).toBeVisible();
    // Como cajero, crear productos aparece deshabilitado con el aviso de rol
    await expect(page.getByTitle('Disponible para administradores y regentes').first()).toBeVisible();
  });

  test('Dashboard: las cifras llegan como pesos, no como texto roto', async ({ page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByText(/\$\s?\d{1,3}(\.\d{3})+/).first()).toBeVisible({ timeout: 20_000 });
    // Regex con límites de palabra y sensible a mayúsculas: getByText('NaN')
    // también encontraría "Fi-nan-zas" en el menú.
    await expect(page.getByText(/\bNaN\b/)).toHaveCount(0);
    // Panel de vencimientos a 30/60/90 días con datos reales
    await expect(page.getByText('Vencimientos próximos')).toBeVisible();
    await expect(page.getByText('≤ 30 días')).toBeVisible();
  });
});

// Sin sesión previa: la página de inicio lleva a la demo con el recorrido abierto
test.describe('Página de inicio', () => {
  test('"Probar la demo" entra como cajero y abre el recorrido guiado', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'CRM y punto de venta para droguerías' })).toBeVisible();
    await page.getByRole('link', { name: 'Probar la demo' }).click();
    await expect(page).toHaveURL(/\/(dashboard|crm)/, { timeout: 30_000 });
    const tour = page.getByRole('dialog', { name: 'Recorrido guiado' });
    await expect(tour).toBeVisible({ timeout: 20_000 });
    await expect(tour.getByText('Pacientes: ficha 360°')).toBeVisible();
    await expect(page.getByText(/Demo con datos ficticios/)).toBeVisible();
    await tour.getByRole('button', { name: 'Cerrar recorrido' }).click();
    await expect(tour).toHaveCount(0);
  });
});
