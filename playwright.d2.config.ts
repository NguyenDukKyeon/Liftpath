import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.D2_BASE_URL;

export default defineConfig({
  testDir: "tests/e2e-d2",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report-d2" }]]
    : "list",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:4173",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    serviceWorkers: "allow",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "ios-webkit",
      use: { ...devices["iPhone 13"] },
      testIgnore: /pwa-offline\.spec\.ts/,
    },
    {
      name: "android-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /pwa-offline\.spec\.ts/,
    },
  ],
});
