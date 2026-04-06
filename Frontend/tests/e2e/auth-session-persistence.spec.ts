import { expect, test } from "@playwright/test";

function buildAccessToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 })
  ).toString("base64url");

  return `qa.${payload}.sig`;
}

async function mockAuthenticatedApis(page: import("@playwright/test").Page): Promise<void> {
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
            username: "qa-premium",
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
            token: "qa_visual_session_token",
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

async function seedRefreshCookie(
  page: import("@playwright/test").Page,
  baseURL: string
): Promise<void> {
  await page.context().addCookies([
    {
      name: "refreshToken",
      value: "qa-refresh-token",
      url: baseURL,
      sameSite: "Lax",
    },
  ]);
}

async function seedRefreshLocalStorage(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("refreshToken", "qa-refresh-token");
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
  });
}

async function assertSessionPersistsAcrossPremiumAndHome(
  page: import("@playwright/test").Page
): Promise<void> {
  await page.goto("/es/icons/premium/fa-solid", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/es\/icons\/premium\/fa-solid/);
  await expect(page.getByRole("heading", { level: 1, name: /fa-solid/i })).toBeVisible();

  await page.goto("/es", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.getByRole("button", { name: "User profile" })).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.getByRole("button", { name: "User profile" })).toBeVisible();

  await page.goto("/es/icons/premium/fa-solid", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/es\/icons\/premium\/fa-solid/);
  await expect(page.getByRole("heading", { level: 1, name: /fa-solid/i })).toBeVisible();
}

test.describe("Auth session persistence", () => {
  test("cookie-backed refresh token keeps session between premium icons and home", async ({
    page,
    baseURL,
  }) => {
    await mockAuthenticatedApis(page);
    await seedRefreshCookie(page, baseURL!);

    await assertSessionPersistsAcrossPremiumAndHome(page);
  });

  test("localStorage-backed refresh token keeps session and backfills cookie", async ({ page }) => {
    await mockAuthenticatedApis(page);
    await seedRefreshLocalStorage(page);

    await assertSessionPersistsAcrossPremiumAndHome(page);

    const hasRefreshCookie = await page.evaluate(() => document.cookie.includes("refreshToken="));
    expect(hasRefreshCookie).toBe(true);
  });
});
