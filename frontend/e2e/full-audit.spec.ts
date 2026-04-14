import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://chainsight-40326.web.app';

test.describe('Meridian Full UI Audit', () => {

  // --- Page Load ---
  test('initial load — page renders with title', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('text=Meridian').first()).toBeVisible();
    await expect(page.locator('text=WAR ROOM')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/audit-01-load.png', fullPage: true });
  });

  test('initial load — all 4 agents in header', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    for (const agent of ['Sentinel', 'Analyst', 'Optimizer', 'Communicator']) {
      await expect(page.locator(`text=${agent}`).first()).toBeVisible();
    }
    await page.screenshot({ path: 'e2e/screenshots/audit-02-agents.png', fullPage: true });
  });

  test('initial load — left sidebar content', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('text=System Status').first()).toBeVisible();
    await expect(page.locator('text=Corridors').first()).toBeVisible();
    await expect(page.locator('text=Asia-Europe').first()).toBeVisible();
    await expect(page.locator('text=US-India').first()).toBeVisible();
    await expect(page.locator('text=Intra-India').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/audit-03-sidebar.png', fullPage: true });
  });

  test('initial load — Google Maps renders', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[class*="gm-style"]', { timeout: 15000 });
    await page.screenshot({ path: 'e2e/screenshots/audit-04-map.png', fullPage: true });
  });

  // --- Theme Toggle ---
  test('theme toggle — dark to light and back', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    const toggle = page.locator('[data-testid="theme-toggle"]').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/audit-05-light-theme.png', fullPage: true });
      await toggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/audit-06-dark-restored.png', fullPage: true });
    }
  });

  // --- Settings Modal ---
  test('settings modal — opens and shows system info', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    const gear = page.locator('[aria-label="Settings"]').first();
    await gear.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/audit-07-settings.png', fullPage: true });
    // Close
    const closeBtn = page.locator('button', { hasText: /Cancel|Close/i }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
  });

  // --- Demo Flow ---
  test('demo flow — full run with screenshots at every stage', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });

    // Click demo button
    const demoBtn = page.locator('button', { hasText: /Run.*Demo/i }).first();
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // T+3s: Sentinel active
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/audit-08-demo-3s.png', fullPage: true });

    // T+6s: Analyst working
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/audit-09-demo-6s.png', fullPage: true });

    // T+10s: Cascade should be visible
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'e2e/screenshots/audit-10-demo-10s.png', fullPage: true });

    // T+14s: Routes should appear
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'e2e/screenshots/audit-11-demo-14s.png', fullPage: true });

    // T+18s: Demo complete
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'e2e/screenshots/audit-12-demo-18s.png', fullPage: true });

    // Click recommended route
    const lombok = page.locator('text=Lombok').first();
    if (await lombok.isVisible()) {
      await lombok.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/audit-13-route-selected.png', fullPage: true });
    }
  });

  // --- Chat Interface ---
  test('chat — open and send message', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });

    // Find chat tab or floating button
    const chatTab = page.locator('[data-testid="chat-tab"]').first();
    const chatFab = page.locator('[aria-label*="chat"]').or(page.locator('[data-testid="chat-fab"]')).first();

    if (await chatFab.isVisible()) {
      await chatFab.click();
    } else if (await chatTab.isVisible()) {
      await chatTab.click();
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/audit-14-chat-open.png', fullPage: true });

    // Click an icebreaker if visible
    const icebreaker = page.locator('text=cascade impact').or(page.locator('text=route costs')).first();
    if (await icebreaker.isVisible()) {
      await icebreaker.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'e2e/screenshots/audit-15-chat-response.png', fullPage: true });
    }

    // Type a custom message
    const chatInput = page.locator('[aria-label="Chat input"]').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('What medicine shipments are at risk?');
      await chatInput.press('Enter');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'e2e/screenshots/audit-16-chat-custom.png', fullPage: true });
    }
  });

  // --- How It Works Modal ---
  test('how it works modal', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    const howBtn = page.locator('text=How It Works').first();
    if (await howBtn.isVisible()) {
      await howBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/audit-17-how-it-works.png', fullPage: true });
    }
  });

  // --- Export Menu ---
  test('export menu opens', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    const exportBtn = page.locator('[aria-label*="export"]').or(page.locator('[aria-label*="Export"]')).or(page.locator('[aria-label*="share"]')).first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/audit-18-export-menu.png', fullPage: true });
    }
  });

  // --- Mobile Responsive ---
  test('mobile — 375px portrait', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/audit-19-mobile-375.png', fullPage: true });
  });

  test('mobile — 375px demo flow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button', { hasText: /Demo/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(18000);
      await page.screenshot({ path: 'e2e/screenshots/audit-20-mobile-demo.png', fullPage: true });
    }
  });

  test('tablet — 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/audit-21-tablet.png', fullPage: true });
  });

  // --- Console Errors ---
  test('no console errors on full flow', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button', { hasText: /Demo/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await page.waitForTimeout(20000);
    }

    const realErrors = errors.filter(e =>
      !e.includes('Google Maps') && !e.includes('firebase') &&
      !e.includes('Failed to load resource') && !e.includes('third-party') &&
      !e.includes('favicon') && !e.includes('ERR_CONNECTION') &&
      !e.includes('net::') && !e.includes('403') && !e.includes('404')
    );

    console.log(`Real console errors: ${realErrors.length}`);
    realErrors.forEach(e => console.log(`  ERROR: ${e}`));

    expect(realErrors.length).toBe(0);
  });
});
