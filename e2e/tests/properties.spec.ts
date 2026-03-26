import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'teste.e2e@exemplo.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Senha123E2E';

async function loginUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|imoveis|properties/, { timeout: 10000 });
}

test.describe('Gerenciamento de Propriedades E2E', () => {
  test.skip(() => !process.env.TEST_EMAIL, 'TEST_EMAIL env var required');

  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('deve acessar página de imóveis', async ({ page }) => {
    await page.goto(`${BASE_URL}/imoveis`);
    await expect(page).toHaveURL(/imoveis|properties/);
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible();
  });

  test('deve exibir lista de imóveis (pode estar vazia)', async ({ page }) => {
    await page.goto(`${BASE_URL}/imoveis`);

    const list = page.locator('[data-testid="property-list"], .property-list, main');
    await expect(list).toBeVisible({ timeout: 5000 });
  });
});
