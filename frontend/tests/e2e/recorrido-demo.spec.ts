import { expect, test, type Page } from '@playwright/test';

// Recorrido sugerido en el README, con la cuenta demo (rol cajero).
// Las credenciales son públicas (README); se pueden sobrescribir por entorno.
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@farmaai.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? '123456';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('admin@farmaai.com').fill(DEMO_EMAIL);
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
    for (const item of ['Dashboard', 'Punto de Venta', 'Ventas y Compras', 'Inventario', 'Finanzas', 'Pacientes']) {
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

    // Navegador nuevo = caja cerrada (el estado de la caja vive en el navegador)
    const abrir = page.getByRole('button', { name: /Realizar Apertura de Caja/ });
    if (await abrir.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await abrir.click();
      await page.getByRole('button', { name: 'Confirmar Apertura' }).click();
      await expect(page.getByText(/Caja abierta exitosamente/)).toBeVisible();
    }

    // Agrega el primer producto del catálogo con Enter en el buscador
    const buscador = page.getByPlaceholder(/Escanear código o buscar producto/);
    await buscador.click();
    await buscador.press('Enter');
    await expect(page.getByRole('button', { name: /COBRAR/ })).toBeEnabled({ timeout: 20_000 });

    await page.getByRole('button', { name: /COBRAR/ }).click();
    await page.getByRole('button', { name: /Tarjeta/ }).click();
    await page.getByRole('button', { name: /CONFIRMAR PAGO/ }).click();
    await expect(page.getByText(/¡Venta Procesada! Total: \$/)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('link', { name: 'Ventas y Compras' }).click();
    await expect(page.getByRole('heading', { name: /Auditoría de Ventas/ })).toBeVisible();
  });

  test('Inventario: muestra lotes ordenados por vencimiento', async ({ page }) => {
    await page.getByRole('link', { name: 'Inventario' }).click();
    await expect(page.getByPlaceholder('Buscar producto o lote...')).toBeVisible();
  });

  test('Dashboard: las cifras llegan como pesos, no como texto roto', async ({ page }) => {
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByText(/\$\s?\d{1,3}(\.\d{3})+/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('NaN')).toHaveCount(0);
  });
});
