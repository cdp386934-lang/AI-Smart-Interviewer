import { test, expect } from '@playwright/test';

test('happy path interview flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('AI Agent 智能面试官系统')).toBeVisible();
});

test('landing page has entry point to interview', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText('AI Agent 智能面试官系统');
});
