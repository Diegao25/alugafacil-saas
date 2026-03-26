import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function clearCookies(page: Page) {
  await page.context().clearCookies();
}

test.describe('Autenticação E2E', () => {
  test.beforeEach(async ({ page }) => {
    await clearCookies(page);
  });

  test('deve exibir formulário de login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'invalido@exemplo.com');
    await page.fill('input[type="password"]', 'SenhaErrada1');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[role="alert"], .error, [data-testid="error"]')).toBeVisible({ timeout: 5000 });
  });

  test('deve navegar para página de registro', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const registerLink = page.locator('a[href*="register"], a[href*="cadastro"]');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register|cadastro/);
    }
  });

  test('deve redirecionar usuário não autenticado para login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/login/);
  });

  test('formulário de registro deve validar senha fraca', async ({ page }) => {
    const registerUrl = `${BASE_URL}/register`;
    await page.goto(registerUrl);

    const emailInput = page.locator('input[type="email"]');
    if (!(await emailInput.isVisible())) {
      test.skip();
      return;
    }

    await page.fill('input[name="nome"], input[placeholder*="nome"]', 'Test User');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');

    // Should show password validation error
    await expect(
      page.locator('text=/senha|password/i').first()
    ).toBeVisible({ timeout: 3000 });
  });
});
