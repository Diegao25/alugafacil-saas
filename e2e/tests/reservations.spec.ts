import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

async function loginUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|reservas|reservations/, { timeout: 10000 });
}

test.describe('Reservas E2E', () => {
  test.skip(() => !TEST_EMAIL, 'TEST_EMAIL env var required');

  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('deve acessar página de reservas', async ({ page }) => {
    await page.goto(`${BASE_URL}/reservas`);
    await expect(page).toHaveURL(/reservas/);
  });

  test('calendário deve ser visível na tela de reservas', async ({ page }) => {
    await page.goto(`${BASE_URL}/reservas`);
    const calendar = page.locator('.rbc-calendar, [data-testid="calendar"]');
    await expect(calendar).toBeVisible({ timeout: 5000 });
  });
});
