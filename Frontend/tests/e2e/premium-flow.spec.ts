import { test, expect } from "@playwright/test";

const LOCALE = "/es";
const BASE_URL = "http://127.0.0.1:3100";

function buildAccessToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 })
  ).toString("base64url");
  return `qa.${payload}.sig`;
}

async function setDarkCookie(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("refreshToken", "qa-refresh-token");
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
  });

  await page.context().addCookies([
    {
      name: "user_prefs",
      value: JSON.stringify({ theme: "dark", iconSet: "core", layer: "expanded" }),
      url: "http://127.0.0.1:3100",
      sameSite: "Lax",
    },
    {
      name: "refreshToken",
      value: "qa-refresh-token",
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);
}

async function mockPremiumSuccessApis(page: import("@playwright/test").Page): Promise<void> {
  const accessToken = buildAccessToken();

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken,
          user: {
            id: "qa-user",
            username: "qa",
            email: "qa@example.com",
            roles_id: 3,
            role_name: "pro",
            token_id: "qa-token-id",
            settings_icons_id: null,
            two_factor_enabled: false,
            created_at: new Date().toISOString(),
          },
        },
      }),
    });
  });

  await page.route("**/api/tokens/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          token: {
            id: "qa-token-id",
            token: "qa_npm_token_premium_spec",
            type: "premium",
            start_date: "2026-04-01T00:00:00.000Z",
            finish_date: "2027-04-01T00:00:00.000Z",
            created_at: "2026-04-01T00:00:00.000Z",
          },
        },
      }),
    });
  });
}

test.describe("Premium success/cancel regression", () => {
  test("premium success keeps dark theme on direct open and refresh", async ({ page }) => {
    await setDarkCookie(page);
    await mockPremiumSuccessApis(page);

    await page.goto(`${LOCALE}/premium/success?session_id=qa-session`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/es\/premium\/success/);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("text=qa-session")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/es\/premium\/success/);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("text=qa-session")).toBeVisible();
  });

  test("premium cancel keeps dark theme on direct open and refresh", async ({ page }) => {
    await setDarkCookie(page);

    await page.goto(`${LOCALE}/premium/cancel`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
