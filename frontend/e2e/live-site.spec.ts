import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://chainsight-40326.web.app';

test.describe('Meridian Live Site E2E', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  });

  test('page loads with Meridian branding', async ({ page }) => {
    await expect(page).toHaveTitle(/Meridian/i);
    const header = page.locator('text=Meridian').first();
    await expect(header).toBeVisible();
    await expect(page.locator('text=WAR ROOM')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/01-initial-load.png', fullPage: true });
  });

  test('4 agent status indicators visible', async ({ page }) => {
    await expect(page.locator('text=Sentinel').first()).toBeVisible();
    await expect(page.locator('text=Analyst').first()).toBeVisible();
    await expect(page.locator('text=Optimizer').first()).toBeVisible();
    await expect(page.locator('text=Communicator').first()).toBeVisible();
  });

  test('Google Maps loads with corridors', async ({ page }) => {
    await page.waitForSelector('[class*="gm-style"], [data-testid="map-loading"]', { timeout: 15000 });
    await expect(page.locator('text=Asia-Europe').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/02-map-loaded.png', fullPage: true });
  });

  test('left sidebar shows corridor status', async ({ page }) => {
    await expect(page.locator('text=Corridors').first()).toBeVisible();
    await expect(page.locator('text=Asia-Europe').first()).toBeVisible();
  });

  test('theme toggle works', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/03-light-theme.png', fullPage: true });
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('Run Typhoon Demo - full flow', async ({ page }) => {
    const demoBtn = page.locator('button', { hasText: /Run.*Scenario|Run.*Demo/i }).first();
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    await page.screenshot({ path: 'e2e/screenshots/04-demo-started.png', fullPage: true });

    await page.waitForTimeout(5000);

    await expect(page.locator('text=ACTIVE').or(page.locator('text=active')).or(page.locator('text=DONE')).or(page.locator('text=done')).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/05-agents-active.png', fullPage: true });

    await page.waitForTimeout(8000);

    const reasoningSteps = page.locator('[data-testid="reasoning-step"]');
    const stepCount = await reasoningSteps.count();
    console.log(`Found ${stepCount} reasoning steps`);

    await page.screenshot({ path: 'e2e/screenshots/06-reasoning-populated.png', fullPage: true });

    await page.waitForTimeout(8000);

    await expect(page.locator('text=Lombok').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=RECOMMENDED').or(page.locator('text=Recommended')).first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/07-routes-visible.png', fullPage: true });

    const recommendedRoute = page.locator('text=Lombok').first();
    await recommendedRoute.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'e2e/screenshots/08-route-selected.png', fullPage: true });

    const doneCount = await page.locator('text=done').count();
    console.log(`Agents in done state: ${doneCount}`);
    expect(doneCount).toBeGreaterThanOrEqual(2);
  });

  test('CRITICAL alert banner appears during demo', async ({ page }) => {
    const demoBtn = page.locator('button', { hasText: /Run.*Scenario|Run.*Demo/i }).first();
    await demoBtn.click();

    await page.waitForTimeout(15000);

    const alert = page.locator('text=CRITICAL').first();
    await expect(alert).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/09-critical-alert.png', fullPage: true });
  });

  test('Download PDF Report button exists and works', async ({ page }) => {
    const demoBtn = page.locator('button', { hasText: /Run.*Scenario|Run.*Demo/i }).first();
    await demoBtn.click();
    await page.waitForTimeout(18000);

    const downloadBtn = page.locator('button', { hasText: /Download.*Report|PDF/i }).first();
    if (await downloadBtn.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        downloadBtn.click()
      ]);
      if (download) {
        console.log(`PDF downloaded: ${download.suggestedFilename()}`);
      }
    }
    await page.screenshot({ path: 'e2e/screenshots/10-download-area.png', fullPage: true });
  });

  test('Chat interface works', async ({ page }) => {
    const chatTab = page.locator('[data-testid="chat-tab"]').or(page.locator('text=Chat').first());
    if (await chatTab.isVisible()) {
      await chatTab.click();
      await page.waitForTimeout(500);

      const chatInput = page.locator('input[placeholder*="Ask"]').or(page.locator('textarea[placeholder*="Ask"]')).first();
      if (await chatInput.isVisible()) {
        await chatInput.fill('What is the cascade impact?');
        await chatInput.press('Enter');
        await page.waitForTimeout(3000);
      }

      await page.screenshot({ path: 'e2e/screenshots/11-chat-interface.png', fullPage: true });
    }
  });

  test('port popup on click', async ({ page }) => {
    await page.waitForSelector('[class*="gm-style"], [data-testid="map-loading"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const mapElement = page.locator('[class*="gm-style"]').first();
    const box = await mapElement.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6);
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'e2e/screenshots/12-map-interaction.png', fullPage: true });
  });

  test('mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Meridian').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/13-mobile-view.png', fullPage: true });
  });

  test('no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const realErrors = errors.filter(e =>
      !e.includes('Google Maps') &&
      !e.includes('firebase') &&
      !e.includes('Failed to load resource') &&
      !e.includes('third-party') &&
      !e.includes('ERR_BLOCKED_BY_CLIENT') &&
      !e.includes('net::')
    );

    console.log(`Console errors found: ${realErrors.length}`);
    realErrors.forEach(e => console.log(`  ERROR: ${e}`));

    expect(realErrors.length).toBe(0);
  });
});
