import { test, expect } from "@playwright/test";

const LOCALE = "/es";
const THEME_COOKIE = "user_prefs";
const BASE_URL = "http://127.0.0.1:3100";

function buildAccessToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 })
  ).toString("base64url");
  return `qa.${payload}.sig`;
}

async function mockAuthenticatedPremiumSuccess(
  page: import("@playwright/test").Page
): Promise<void> {
  const accessToken = buildAccessToken();

  await page.context().addCookies([
    {
      name: "refreshToken",
      value: "qa-refresh-token",
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);

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
            token: "qa_npm_token_theme_spec",
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

async function setDarkThemeState(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("refreshToken", "qa-refresh-token");
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
  });

  await page.context().addCookies([
    {
      name: "user_prefs",
      value: JSON.stringify({ theme: "dark", iconSet: "core", layer: "expanded" }),
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);
}

async function readThemeCookie(page: import("@playwright/test").Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const raw = cookies.find((cookie) => cookie.name === THEME_COOKIE)?.value;

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { theme?: string };
    return typeof parsed.theme === "string" ? parsed.theme : null;
  } catch {
    return null;
  }
}

async function ensureDarkMode(page: import("@playwright/test").Page): Promise<void> {
  await setDarkThemeState(page);
  await page.goto(LOCALE, { waitUntil: "domcontentloaded" });
  const html = page.locator("html");

  const before = await html.getAttribute("class");
  if (!(before ?? "").includes("dark")) {
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(html).toHaveClass(/\bdark\b/);
    await page.goto(LOCALE, { waitUntil: "domcontentloaded" });
    await expect(html).toHaveClass(/\bdark\b/);
  } else {
    await expect(html).toHaveClass(/\bdark\b/);
  }
}

test.describe("Theme persistence regression", () => {
  test("dark theme persists across home/icons/premium with hard refresh", async ({ page }) => {
    await ensureDarkMode(page);

    await page.goto(`${LOCALE}/icons`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.goto(`${LOCALE}/premium`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    const cookieTheme = await readThemeCookie(page);
    expect(cookieTheme).toBe("dark");
  });

  test("dark theme is applied on direct open of premium success and cancel routes", async ({ page }) => {
    await ensureDarkMode(page);
    await mockAuthenticatedPremiumSuccess(page);

    await page.goto(`${LOCALE}/premium/success?session_id=qa-session`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/es\/premium\/success/);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("text=qa-session")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/es\/premium\/success/);
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.locator("text=qa-session")).toBeVisible();

    await page.goto(`${LOCALE}/premium/cancel`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    const cookieTheme = await readThemeCookie(page);
    expect(cookieTheme).toBe("dark");
  });
});
