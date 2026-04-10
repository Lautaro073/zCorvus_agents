import { expect, test } from "@playwright/test";

type RoleName = "admin" | "user" | "pro";

const REFRESH_TOKEN = "qa-refresh-token-admin-theme-locale";

function buildAccessToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 })
  ).toString("base64url");

  return `qa.${payload}.sig`;
}

function createMockUser(roleName: RoleName) {
  return {
    id: `qa-${roleName}-user`,
    username: `qa-${roleName}`,
    email: `qa-${roleName}@example.com`,
    roles_id: roleName === "admin" ? 1 : roleName === "pro" ? 3 : 2,
    role_name: roleName,
    token_id: "qa-admin-token",
    settings_icons_id: null,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
  };
}

async function seedAdminSession(page: import("@playwright/test").Page, baseURL: string): Promise<void> {
  await page.context().addCookies([
    {
      name: "refreshToken",
      value: REFRESH_TOKEN,
      url: baseURL,
      sameSite: "Lax",
    },
    {
      name: "userRole",
      value: "admin",
      url: baseURL,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript((token) => {
    localStorage.setItem("refreshToken", token);
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
    localStorage.setItem("userRole", "admin");
  }, REFRESH_TOKEN);
}

async function mockRefreshAuth(page: import("@playwright/test").Page): Promise<void> {
  const accessToken = buildAccessToken();

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken,
          user: createMockUser("admin"),
        },
      }),
    });
  });
}

async function mockAdminApis(page: import("@playwright/test").Page): Promise<void> {
  await page.route("**/api/admin/users**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pageParam = Number(requestUrl.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(requestUrl.searchParams.get("pageSize") ?? "20");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: `qa-admin-row-${pageParam}`,
            username: `admin-visible-${pageParam}`,
            email: `admin-visible-${pageParam}@example.com`,
            roles_id: 1,
            role_name: "admin",
            token_id: `qa-token-${pageParam}`,
            token_finish_date: "2027-04-10T00:00:00.000Z",
            subscriptionStatus: "active",
            two_factor_enabled: false,
            created_at: "2026-04-01T00:00:00.000Z",
            updated_at: "2026-04-01T00:00:00.000Z",
          },
        ],
        pagination: {
          page: pageParam,
          pageSize: pageSizeParam,
          limit: pageSizeParam,
          total: 40,
          totalPages: 2,
          hasNext: pageParam < 2,
          hasPrev: pageParam > 1,
        },
        filtersApplied: {
          search: requestUrl.searchParams.get("search"),
          role: requestUrl.searchParams.get("role"),
          subscriptionStatus: requestUrl.searchParams.get("subscriptionStatus"),
          sortBy: requestUrl.searchParams.get("sortBy") ?? "id",
          sortDir: requestUrl.searchParams.get("sortDir") ?? "desc",
          expiringInDays: Number(requestUrl.searchParams.get("expiringInDays") ?? "7"),
        },
        generatedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/admin/subscriptions**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pageParam = Number(requestUrl.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(requestUrl.searchParams.get("pageSize") ?? "20");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            user_id: `qa-admin-row-${pageParam}`,
            user_email: `admin-visible-${pageParam}@example.com`,
            username: `admin-visible-${pageParam}`,
            token_id: `qa-token-${pageParam}`,
            plan_type: "pro",
            start_date: "2026-04-01T00:00:00.000Z",
            finish_date: "2027-04-10T00:00:00.000Z",
            subscriptionStatus: "active",
          },
        ],
        summaryCounts: {
          active: 1,
          expiring: 0,
          expired: 0,
          total: 1,
        },
        pagination: {
          page: pageParam,
          pageSize: pageSizeParam,
          limit: pageSizeParam,
          total: 40,
          totalPages: 2,
          hasNext: pageParam < 2,
          hasPrev: pageParam > 1,
        },
        filtersApplied: {
          status: requestUrl.searchParams.get("status"),
          planType: requestUrl.searchParams.get("planType"),
          expiringInDays: Number(requestUrl.searchParams.get("expiringInDays") ?? "7"),
          from: requestUrl.searchParams.get("from"),
          to: requestUrl.searchParams.get("to"),
        },
        generatedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/admin/metrics**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const granularity = requestUrl.searchParams.get("granularity") ?? "day";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          kpis: {
            registrations: 21,
            salesCount: 12,
            grossRevenue: 320000,
            netRevenue: 294000,
          },
          timeseries: [
            {
              bucketKey: "2026-04-01",
              bucketStart: "2026-04-01T00:00:00.000Z",
              bucketEnd: "2026-04-01T23:59:59.999Z",
              registrations: 3,
              salesCount: 2,
              grossRevenue: 48000,
              netRevenue: 43000,
            },
          ],
        },
        filtersApplied: {
          granularity,
          from: requestUrl.searchParams.get("from") ?? "2026-04-01T00:00:00.000Z",
          to: requestUrl.searchParams.get("to") ?? "2026-04-07T23:59:59.999Z",
          bucketGranularity: granularity === "custom" ? "day" : granularity,
        },
        generatedAt: new Date().toISOString(),
      }),
    });
  });
}

test.describe("Admin locale/theme controls regression", () => {
  test("locale toggle keeps admin route and query-state", async ({ page, baseURL }) => {
    await seedAdminSession(page, baseURL!);
    await mockRefreshAuth(page);
    await mockAdminApis(page);

    await page.goto("/es/admin?usersPage=2&role=admin&granularity=custom&from=2026-04-01T00%3A00%3A00.000Z&to=2026-04-07T23%3A59%3A59.999Z", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { level: 1, name: /panel de administracion/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /switch locale|cambiar idioma/i })).toBeVisible();

    await page.getByRole("button", { name: /switch locale|cambiar idioma/i }).click();

    await expect(page).toHaveURL(/\/en\/admin/);
    await expect(page).toHaveURL(/usersPage=2/);
    await expect(page).toHaveURL(/role=admin/);
    await expect(page).toHaveURL(/granularity=custom/);
    await expect(page).toHaveURL(/from=2026-04-01T00%3A00%3A00.000Z/);
    await expect(page).toHaveURL(/to=2026-04-07T23%3A59%3A59.999Z/);

    await expect(page.getByRole("heading", { level: 1, name: /admin dashboard/i })).toBeVisible();
  });

  test("theme toggle applies instantly without full reload and keeps scroll", async ({ page, baseURL }) => {
    await seedAdminSession(page, baseURL!);
    await mockRefreshAuth(page);
    await mockAdminApis(page);

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Actualizar" }).first().click();

    await page.evaluate(() => {
      window.scrollTo(0, 500);
      (window as typeof window & { __adminThemeMarker?: string }).__adminThemeMarker = "keep-page";
    });

    const before = await page.evaluate(() => ({
      className: document.documentElement.className,
      theme: document.documentElement.dataset.theme,
      navCount: performance.getEntriesByType("navigation").length,
      scrollY: window.scrollY,
      marker: (window as typeof window & { __adminThemeMarker?: string }).__adminThemeMarker,
    }));

    expect(before.scrollY).toBeGreaterThan(100);

    await page.evaluate(() => {
      const themeToggle = document.querySelector<HTMLButtonElement>(
        "button[aria-label='Cambiar tema'], button[aria-label='Toggle theme']"
      );

      if (!themeToggle) {
        throw new Error("Theme toggle button not found");
      }

      themeToggle.click();
    });

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          className: document.documentElement.className,
          theme: document.documentElement.dataset.theme,
        }))
      )
      .not.toEqual({ className: before.className, theme: before.theme });

    const after = await page.evaluate(() => ({
      navCount: performance.getEntriesByType("navigation").length,
      scrollY: window.scrollY,
      marker: (window as typeof window & { __adminThemeMarker?: string }).__adminThemeMarker,
    }));

    expect(after.navCount).toBe(before.navCount);
    expect(after.marker).toBe("keep-page");
    expect(after.scrollY).toBeGreaterThan(100);
    expect(Math.abs(after.scrollY - before.scrollY)).toBeLessThanOrEqual(20);
  });

  test("admin controls do not expose icon-set toggle", async ({ page, baseURL }) => {
    await seedAdminSession(page, baseURL!);
    await mockRefreshAuth(page);
    await mockAdminApis(page);

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: /toggle theme|cambiar tema/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /switch locale|cambiar idioma/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /change icon set|cambiar set de iconos/i })).toHaveCount(0);
    await expect(page.getByLabel("Granularidad")).toBeVisible();
  });
});
