# End-to-End Testing Guide

End-to-end testing validates complete user workflows in a real browser environment. This guide covers browser automation, user interaction testing, and visual regression testing for Qirvo plugins.

## Table of Contents

- [E2E Test Setup](#e2e-test-setup)
- [Browser Automation](#browser-automation)
- [User Interaction Testing](#user-interaction-testing)
- [Visual Regression Testing](#visual-regression-testing)
- [Performance Testing](#performance-testing)
- [Cross-Browser Testing](#cross-browser-testing)

## E2E Test Setup

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});
```

### Test Environment Setup

```typescript
// tests/e2e/setup/testEnvironment.ts
import { Page, Browser, BrowserContext } from '@playwright/test';

export class TestEnvironment {
  constructor(
    public browser: Browser,
    public context: BrowserContext,
    public page: Page
  ) {}

  async setupPlugin(pluginConfig: any): Promise<void> {
    // Navigate to plugin installation page
    await this.page.goto('/plugins/install');
    
    // Install test plugin
    await this.page.fill('[data-testid="plugin-url"]', 'http://localhost:3001/test-plugin.zip');
    await this.page.click('[data-testid="install-button"]');
    
    // Wait for installation to complete
    await this.page.waitForSelector('[data-testid="installation-success"]');
    
    // Configure plugin
    await this.page.goto('/plugins/weather/config');
    await this.page.fill('[data-testid="api-key-input"]', pluginConfig.apiKey);
    await this.page.fill('[data-testid="location-input"]', pluginConfig.defaultLocation);
    await this.page.click('[data-testid="save-config"]');
    
    // Wait for configuration to save
    await this.page.waitForSelector('[data-testid="config-saved"]');
  }

  async enablePlugin(pluginId: string): Promise<void> {
    await this.page.goto(`/plugins/${pluginId}`);
    await this.page.click('[data-testid="enable-plugin"]');
    await this.page.waitForSelector('[data-testid="plugin-enabled"]');
  }

  async navigateToDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async cleanup(): Promise<void> {
    // Remove test plugin
    await this.page.goto('/plugins');
    await this.page.click('[data-testid="weather-plugin"] [data-testid="uninstall"]');
    await this.page.click('[data-testid="confirm-uninstall"]');
    await this.page.waitForSelector('[data-testid="plugin-uninstalled"]');
  }
}
```

## Browser Automation

### Plugin Installation Flow

```typescript
// tests/e2e/pluginInstallation.spec.ts
import { test, expect } from '@playwright/test';
import { TestEnvironment } from './setup/testEnvironment';

test.describe('Plugin Installation', () => {
  let testEnv: TestEnvironment;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    testEnv = new TestEnvironment(browser, context, page);
  });

  test.afterEach(async () => {
    await testEnv.cleanup();
    await testEnv.context.close();
  });

  test('should install plugin from URL', async () => {
    await testEnv.page.goto('/plugins/install');

    // Fill plugin URL
    await testEnv.page.fill('[data-testid="plugin-url"]', 'https://github.com/user/weather-plugin/releases/latest/download/plugin.zip');
    
    // Click install button
    await testEnv.page.click('[data-testid="install-button"]');
    
    // Wait for installation progress
    await expect(testEnv.page.locator('[data-testid="installation-progress"]')).toBeVisible();
    
    // Wait for success message
    await expect(testEnv.page.locator('[data-testid="installation-success"]')).toBeVisible({ timeout: 30000 });
    
    // Verify plugin appears in installed list
    await testEnv.page.goto('/plugins');
    await expect(testEnv.page.locator('[data-testid="weather-plugin"]')).toBeVisible();
  });

  test('should handle invalid plugin URL', async () => {
    await testEnv.page.goto('/plugins/install');

    await testEnv.page.fill('[data-testid="plugin-url"]', 'https://invalid-url.com/plugin.zip');
    await testEnv.page.click('[data-testid="install-button"]');
    
    // Should show error message
    await expect(testEnv.page.locator('[data-testid="installation-error"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="installation-error"]')).toContainText('Failed to download plugin');
  });

  test('should install plugin from file upload', async () => {
    await testEnv.page.goto('/plugins/install');

    // Switch to file upload tab
    await testEnv.page.click('[data-testid="upload-tab"]');
    
    // Upload plugin file
    const fileInput = testEnv.page.locator('[data-testid="plugin-file-input"]');
    await fileInput.setInputFiles('tests/fixtures/weather-plugin.zip');
    
    // Click upload button
    await testEnv.page.click('[data-testid="upload-button"]');
    
    // Wait for installation success
    await expect(testEnv.page.locator('[data-testid="installation-success"]')).toBeVisible({ timeout: 30000 });
  });
});
```

### Plugin Configuration

```typescript
// tests/e2e/pluginConfiguration.spec.ts
import { test, expect } from '@playwright/test';
import { TestEnvironment } from './setup/testEnvironment';

test.describe('Plugin Configuration', () => {
  let testEnv: TestEnvironment;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    testEnv = new TestEnvironment(browser, context, page);
    
    // Install and enable plugin
    await testEnv.setupPlugin({
      apiKey: 'test-api-key',
      defaultLocation: 'London'
    });
  });

  test.afterEach(async () => {
    await testEnv.cleanup();
    await testEnv.context.close();
  });

  test('should configure plugin settings', async () => {
    await testEnv.page.goto('/plugins/weather/config');

    // Update API key
    await testEnv.page.fill('[data-testid="api-key-input"]', 'new-api-key');
    
    // Update default location
    await testEnv.page.fill('[data-testid="location-input"]', 'Paris');
    
    // Change units
    await testEnv.page.selectOption('[data-testid="units-select"]', 'imperial');
    
    // Enable notifications
    await testEnv.page.check('[data-testid="notifications-checkbox"]');
    
    // Save configuration
    await testEnv.page.click('[data-testid="save-config"]');
    
    // Verify success message
    await expect(testEnv.page.locator('[data-testid="config-saved"]')).toBeVisible();
    
    // Verify settings were saved
    await testEnv.page.reload();
    await expect(testEnv.page.locator('[data-testid="api-key-input"]')).toHaveValue('new-api-key');
    await expect(testEnv.page.locator('[data-testid="location-input"]')).toHaveValue('Paris');
    await expect(testEnv.page.locator('[data-testid="units-select"]')).toHaveValue('imperial');
    await expect(testEnv.page.locator('[data-testid="notifications-checkbox"]')).toBeChecked();
  });

  test('should validate required fields', async () => {
    await testEnv.page.goto('/plugins/weather/config');

    // Clear required field
    await testEnv.page.fill('[data-testid="api-key-input"]', '');
    
    // Try to save
    await testEnv.page.click('[data-testid="save-config"]');
    
    // Should show validation error
    await expect(testEnv.page.locator('[data-testid="api-key-error"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="api-key-error"]')).toContainText('API key is required');
  });

  test('should test API connection', async () => {
    await testEnv.page.goto('/plugins/weather/config');

    await testEnv.page.fill('[data-testid="api-key-input"]', 'valid-api-key');
    
    // Click test connection button
    await testEnv.page.click('[data-testid="test-connection"]');
    
    // Should show loading state
    await expect(testEnv.page.locator('[data-testid="test-loading"]')).toBeVisible();
    
    // Should show success message
    await expect(testEnv.page.locator('[data-testid="test-success"]')).toBeVisible({ timeout: 10000 });
    await expect(testEnv.page.locator('[data-testid="test-success"]')).toContainText('Connection successful');
  });
});
```

## User Interaction Testing

### Dashboard Widget Interaction

```typescript
// tests/e2e/dashboardWidget.spec.ts
import { test, expect } from '@playwright/test';
import { TestEnvironment } from './setup/testEnvironment';

test.describe('Weather Widget Dashboard', () => {
  let testEnv: TestEnvironment;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    testEnv = new TestEnvironment(browser, context, page);
    
    await testEnv.setupPlugin({
      apiKey: 'test-api-key',
      defaultLocation: 'London'
    });
    await testEnv.enablePlugin('weather');
    await testEnv.navigateToDashboard();
  });

  test.afterEach(async () => {
    await testEnv.cleanup();
    await testEnv.context.close();
  });

  test('should display weather widget on dashboard', async () => {
    // Verify widget is visible
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toBeVisible();
    
    // Verify widget content
    await expect(testEnv.page.locator('[data-testid="weather-location"]')).toContainText('London');
    await expect(testEnv.page.locator('[data-testid="weather-temperature"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="weather-description"]')).toBeVisible();
  });

  test('should refresh weather data', async () => {
    // Wait for initial load
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toBeVisible();
    
    // Get initial temperature
    const initialTemp = await testEnv.page.locator('[data-testid="weather-temperature"]').textContent();
    
    // Click refresh button
    await testEnv.page.click('[data-testid="refresh-weather"]');
    
    // Should show loading state
    await expect(testEnv.page.locator('[data-testid="weather-loading"]')).toBeVisible();
    
    // Should update with new data
    await expect(testEnv.page.locator('[data-testid="weather-loading"]')).not.toBeVisible({ timeout: 10000 });
    
    // Temperature should be updated (assuming mock returns different values)
    const updatedTemp = await testEnv.page.locator('[data-testid="weather-temperature"]').textContent();
    expect(updatedTemp).toBeDefined();
  });

  test('should change location', async () => {
    // Click location change button
    await testEnv.page.click('[data-testid="change-location"]');
    
    // Enter new location
    await testEnv.page.fill('[data-testid="location-input"]', 'Paris');
    await testEnv.page.click('[data-testid="confirm-location"]');
    
    // Should show loading
    await expect(testEnv.page.locator('[data-testid="weather-loading"]')).toBeVisible();
    
    // Should update location
    await expect(testEnv.page.locator('[data-testid="weather-location"]')).toContainText('Paris');
  });

  test('should handle network errors gracefully', async () => {
    // Simulate network failure
    await testEnv.page.route('**/api/weather/**', route => {
      route.abort('failed');
    });
    
    // Try to refresh
    await testEnv.page.click('[data-testid="refresh-weather"]');
    
    // Should show error state
    await expect(testEnv.page.locator('[data-testid="weather-error"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="weather-error"]')).toContainText('Failed to load weather data');
    
    // Should show retry button
    await expect(testEnv.page.locator('[data-testid="retry-weather"]')).toBeVisible();
  });

  test('should expand to detailed view', async () => {
    // Click expand button
    await testEnv.page.click('[data-testid="expand-weather"]');
    
    // Should show detailed view
    await expect(testEnv.page.locator('[data-testid="weather-detailed"]')).toBeVisible();
    
    // Should show additional metrics
    await expect(testEnv.page.locator('[data-testid="weather-humidity"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="weather-wind"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="weather-pressure"]')).toBeVisible();
    
    // Should show forecast
    await expect(testEnv.page.locator('[data-testid="weather-forecast"]')).toBeVisible();
  });
});
```

### Settings and Preferences

```typescript
// tests/e2e/userPreferences.spec.ts
import { test, expect } from '@playwright/test';
import { TestEnvironment } from './setup/testEnvironment';

test.describe('User Preferences', () => {
  let testEnv: TestEnvironment;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    testEnv = new TestEnvironment(browser, context, page);
    
    await testEnv.setupPlugin({
      apiKey: 'test-api-key',
      defaultLocation: 'London'
    });
    await testEnv.enablePlugin('weather');
  });

  test.afterEach(async () => {
    await testEnv.cleanup();
    await testEnv.context.close();
  });

  test('should save user theme preference', async () => {
    await testEnv.page.goto('/plugins/weather/preferences');

    // Change theme
    await testEnv.page.selectOption('[data-testid="theme-select"]', 'dark');
    
    // Save preferences
    await testEnv.page.click('[data-testid="save-preferences"]');
    
    // Verify success message
    await expect(testEnv.page.locator('[data-testid="preferences-saved"]')).toBeVisible();
    
    // Navigate to dashboard and verify theme applied
    await testEnv.navigateToDashboard();
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toHaveClass(/dark-theme/);
  });

  test('should configure notification preferences', async () => {
    await testEnv.page.goto('/plugins/weather/preferences');

    // Enable weather alerts
    await testEnv.page.check('[data-testid="weather-alerts-checkbox"]');
    
    // Set alert threshold
    await testEnv.page.fill('[data-testid="alert-threshold"]', '30');
    
    // Select notification types
    await testEnv.page.check('[data-testid="email-notifications"]');
    await testEnv.page.check('[data-testid="push-notifications"]');
    
    // Save preferences
    await testEnv.page.click('[data-testid="save-preferences"]');
    
    // Verify settings persist
    await testEnv.page.reload();
    await expect(testEnv.page.locator('[data-testid="weather-alerts-checkbox"]')).toBeChecked();
    await expect(testEnv.page.locator('[data-testid="alert-threshold"]')).toHaveValue('30');
    await expect(testEnv.page.locator('[data-testid="email-notifications"]')).toBeChecked();
    await expect(testEnv.page.locator('[data-testid="push-notifications"]')).toBeChecked();
  });
});
```

## Visual Regression Testing

### Screenshot Comparison

```typescript
// tests/e2e/visualRegression.spec.ts
import { test, expect } from '@playwright/test';
import { TestEnvironment } from './setup/testEnvironment';

test.describe('Visual Regression', () => {
  let testEnv: TestEnvironment;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    testEnv = new TestEnvironment(browser, context, page);
    
    await testEnv.setupPlugin({
      apiKey: 'test-api-key',
      defaultLocation: 'London'
    });
    await testEnv.enablePlugin('weather');
  });

  test.afterEach(async () => {
    await testEnv.cleanup();
    await testEnv.context.close();
  });

  test('should match weather widget appearance', async () => {
    await testEnv.navigateToDashboard();
    
    // Wait for widget to load
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toBeVisible();
    
    // Take screenshot of widget
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toHaveScreenshot('weather-widget.png');
  });

  test('should match configuration page layout', async () => {
    await testEnv.page.goto('/plugins/weather/config');
    
    // Wait for form to load
    await expect(testEnv.page.locator('[data-testid="config-form"]')).toBeVisible();
    
    // Take full page screenshot
    await expect(testEnv.page).toHaveScreenshot('config-page.png', {
      fullPage: true
    });
  });

  test('should match error states', async () => {
    // Simulate API error
    await testEnv.page.route('**/api/weather/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await testEnv.navigateToDashboard();
    
    // Wait for error state
    await expect(testEnv.page.locator('[data-testid="weather-error"]')).toBeVisible();
    
    // Screenshot error state
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toHaveScreenshot('weather-error.png');
  });

  test('should match loading states', async () => {
    // Delay API response
    await testEnv.page.route('**/api/weather/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await testEnv.navigateToDashboard();
    
    // Screenshot loading state
    await expect(testEnv.page.locator('[data-testid="weather-loading"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toHaveScreenshot('weather-loading.png');
  });

  test('should match responsive layouts', async () => {
    // Test mobile viewport
    await testEnv.page.setViewportSize({ width: 375, height: 667 });
    await testEnv.navigateToDashboard();
    
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toBeVisible();
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toHaveScreenshot('weather-mobile.png');
    
    // Test tablet viewport
    await testEnv.page.setViewportSize({ width: 768, height: 1024 });
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toHaveScreenshot('weather-tablet.png');
  });
});
```

## Performance Testing

### Load Time Testing

```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';
import { TestEnvironment } from './setup/testEnvironment';

test.describe('Performance', () => {
  let testEnv: TestEnvironment;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    testEnv = new TestEnvironment(browser, context, page);
    
    await testEnv.setupPlugin({
      apiKey: 'test-api-key',
      defaultLocation: 'London'
    });
    await testEnv.enablePlugin('weather');
  });

  test.afterEach(async () => {
    await testEnv.cleanup();
    await testEnv.context.close();
  });

  test('should load dashboard within performance budget', async () => {
    const startTime = Date.now();
    
    await testEnv.navigateToDashboard();
    await expect(testEnv.page.locator('[data-testid="weather-widget"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should measure widget rendering performance', async () => {
    await testEnv.navigateToDashboard();
    
    // Measure performance metrics
    const metrics = await testEnv.page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('measure')));
    });
    
    // Check for performance marks
    const paintMetrics = await testEnv.page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('paint')));
    });
    
    expect(paintMetrics.length).toBeGreaterThan(0);
  });

  test('should handle large datasets efficiently', async () => {
    // Mock API with large response
    await testEnv.page.route('**/api/weather/forecast**', route => {
      const largeResponse = {
        forecast: Array.from({ length: 100 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
          temperature: 20 + Math.random() * 10,
          description: 'Sunny'
        }))
      };
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeResponse)
      });
    });
    
    await testEnv.navigateToDashboard();
    
    // Expand to detailed view
    await testEnv.page.click('[data-testid="expand-weather"]');
    
    const startTime = Date.now();
    await expect(testEnv.page.locator('[data-testid="weather-forecast"]')).toBeVisible();
    const renderTime = Date.now() - startTime;
    
    // Should render large dataset within 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  test('should maintain performance during interactions', async () => {
    await testEnv.navigateToDashboard();
    
    // Measure interaction performance
    const startTime = performance.now();
    
    for (let i = 0; i < 10; i++) {
      await testEnv.page.click('[data-testid="refresh-weather"]');
      await expect(testEnv.page.locator('[data-testid="weather-loading"]')).toBeVisible();
      await expect(testEnv.page.locator('[data-testid="weather-loading"]')).not.toBeVisible();
    }
    
    const totalTime = performance.now() - startTime;
    const averageTime = totalTime / 10;
    
    // Average interaction should be under 500ms
    expect(averageTime).toBeLessThan(500);
  });
});
```

## Cross-Browser Testing

### Browser Compatibility

```typescript
// tests/e2e/crossBrowser.spec.ts
import { test, expect, devices } from '@playwright/test';
import { TestEnvironment } from './setup/testEnvironment';

const browsers = ['chromium', 'firefox', 'webkit'];
const mobileDevices = ['iPhone 12', 'Pixel 5', 'iPad Pro'];

browsers.forEach(browserName => {
  test.describe(`${browserName} Browser Tests`, () => {
    test(`should work correctly in ${browserName}`, async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const testEnv = new TestEnvironment(browser, context, page);
      
      await testEnv.setupPlugin({
        apiKey: 'test-api-key',
        defaultLocation: 'London'
      });
      await testEnv.enablePlugin('weather');
      await testEnv.navigateToDashboard();
      
      // Verify core functionality works
      await expect(page.locator('[data-testid="weather-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="weather-temperature"]')).toBeVisible();
      
      // Test interactions
      await page.click('[data-testid="refresh-weather"]');
      await expect(page.locator('[data-testid="weather-loading"]')).toBeVisible();
      
      await testEnv.cleanup();
      await context.close();
    });
  });
});

mobileDevices.forEach(deviceName => {
  test.describe(`${deviceName} Mobile Tests`, () => {
    test(`should work correctly on ${deviceName}`, async ({ browser }) => {
      const device = devices[deviceName];
      const context = await browser.newContext({
        ...device
      });
      const page = await context.newPage();
      const testEnv = new TestEnvironment(browser, context, page);
      
      await testEnv.setupPlugin({
        apiKey: 'test-api-key',
        defaultLocation: 'London'
      });
      await testEnv.enablePlugin('weather');
      await testEnv.navigateToDashboard();
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="weather-widget"]')).toBeVisible();
      
      // Test touch interactions
      await page.tap('[data-testid="refresh-weather"]');
      await expect(page.locator('[data-testid="weather-loading"]')).toBeVisible();
      
      await testEnv.cleanup();
      await context.close();
    });
  });
});
```

This comprehensive E2E testing guide ensures your Qirvo plugins work correctly across all browsers, devices, and real-world user scenarios.

---

**Next**: [Testing Overview](./README.md)
