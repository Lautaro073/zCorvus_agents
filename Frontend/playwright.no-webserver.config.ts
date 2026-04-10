import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3101";
const adminStubURL = process.env.PLAYWRIGHT_ADMIN_STUB_URL ?? "http://127.0.0.1:3001/__qa_stub_health";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["playwright-report/**"],
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node tests/e2e/admin-auth-stub-server.mjs",
    name: "Admin SSR stub",
    url: adminStubURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
