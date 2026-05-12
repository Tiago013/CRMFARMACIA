import { test, expect } from '@playwright/test';

test.describe('POS Enterprise Critical Workflows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to POS page
    await page.goto('/sales');
  });

  test('should allow keyboard-first checkout flow', async ({ page }) => {
    // F2 to focus search
    await page.keyboard.press('F2');
    await expect(page.getByPlaceholder('Escanear código o buscar producto')).toBeFocused();
    
    // Type search
    await page.keyboard.type('Aspirina');
    await page.keyboard.press('Enter');
    
    // Verify item in cart
    await expect(page.locator('text=Aspirina 100mg')).toBeVisible();
    await expect(page.locator('text=$5.50 c/u')).toBeVisible();

    // F4 to select patient
    await page.keyboard.press('F4');
    await expect(page.locator('text=Asignar Paciente')).toBeVisible();
    await page.locator('text=María Elena Salazar').click();
    
    // Verify patient selected
    await expect(page.locator('text=María Elena Salazar')).toBeVisible();
    await expect(page.locator('text=Sugerencia Refill')).toBeVisible();

    // F8 to checkout
    await page.keyboard.press('F8');
    await expect(page.locator('text=Orquestador de Pagos')).toBeVisible();
    
    // Click Efectivo to complete (would normally hit API and show alert)
    // For now we just verify the modal opens and displays correct total
    await expect(page.locator('text=$5.50').last()).toBeVisible();
  });
});
