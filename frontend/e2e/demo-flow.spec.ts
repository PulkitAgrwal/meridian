import { test, expect } from '@playwright/test';

test.describe('Meridian Demo Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with war room header', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Meridian');
    await expect(page.getByText('WAR ROOM')).toBeVisible();
  });

  test('all 4 agent status indicators visible', async ({ page }) => {
    const agents = ['Sentinel', 'Analyst', 'Optimizer', 'Communicator'];
    for (const agent of agents) {
      await expect(page.getByText(agent).first()).toBeVisible();
    }
  });

  test('corridor legend displays 3 corridors', async ({ page }) => {
    await expect(page.getByText('Asia-Europe').first()).toBeVisible();
    await expect(page.getByText('US-India').first()).toBeVisible();
    await expect(page.getByText('Intra-India').first()).toBeVisible();
  });

  test('map container loads', async ({ page }) => {
    await expect(page.locator('.gm-style, [data-testid="map-loading"]')).toBeVisible({ timeout: 15000 });
  });

  test('Run Typhoon Scenario button starts demo pipeline', async ({ page }) => {
    const runButton = page.getByRole('button', { name: /Run Typhoon Scenario/i });
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();

    await runButton.click();

    await expect(page.getByRole('button', { name: /Running/i })).toBeVisible();
    await expect(page.getByText('active').first()).toBeVisible({ timeout: 5000 });
  });

  test('reasoning panel populates with steps during demo', async ({ page }) => {
    await page.getByRole('button', { name: /Run Typhoon Scenario/i }).click();

    await page.waitForTimeout(5000);
    const steps = page.locator('[data-testid="reasoning-step"]');
    const count = await steps.count();
    expect(count).toBeGreaterThanOrEqual(3);

    await expect(page.getByText('SENTINEL').first()).toBeVisible();
  });

  test('route alternatives panel appears during optimization phase', async ({ page }) => {
    await page.getByRole('button', { name: /Run Typhoon Scenario/i }).click();

    await expect(page.getByText('Lombok Strait bypass').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Hold at anchorage').first()).toBeVisible();
    await expect(page.getByText('Sunda Strait bypass').first()).toBeVisible();

    await expect(page.getByText('RECOMMENDED').first()).toBeVisible();
  });

  test('alert banner appears during communication phase', async ({ page }) => {
    await page.getByRole('button', { name: /Run Typhoon Scenario/i }).click();

    await expect(page.getByText('CRITICAL').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Typhoon Gaemi').first()).toBeVisible();
  });

  test('demo completes with all agents showing done status', async ({ page }) => {
    await page.getByRole('button', { name: /Run Typhoon Scenario/i }).click();

    await expect(page.getByText('done').first()).toBeVisible({ timeout: 25000 });

    await page.waitForTimeout(16000);

    await expect(page.getByRole('button', { name: /Reset/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Re-run Scenario/i })).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    const toggle = page.locator('[data-testid="theme-toggle"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await page.waitForTimeout(300);
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBeTruthy();
  });

  test('reset button clears demo state', async ({ page }) => {
    await page.getByRole('button', { name: /Run Typhoon Scenario/i }).click();
    await page.waitForTimeout(17000);

    await page.getByRole('button', { name: /Reset/i }).click();
    await expect(page.getByText('Run Typhoon Scenario')).toBeVisible();
  });

  test('full demo screenshots', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/01-initial.png', fullPage: true });

    await page.getByRole('button', { name: /Run Typhoon Scenario/i }).click();

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/02-detection.png', fullPage: true });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'e2e/screenshots/03-analysis.png', fullPage: true });

    await expect(page.getByText('Lombok Strait bypass').first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'e2e/screenshots/04-optimization.png', fullPage: true });

    await expect(page.getByText('CRITICAL').first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'e2e/screenshots/05-alert.png', fullPage: true });

    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'e2e/screenshots/06-complete.png', fullPage: true });
  });
});
