import { expect, test } from "@playwright/test";

type RoleName = "admin" | "user" | "pro";

const REFRESH_TOKEN = "qa-refresh-token-admin-panel";

interface MockAccountIdentity {
  id: string;
  username: string;
  email: string;
  tokenId?: string;
}

const MOCK_PREFERENCE_COLUMNS = [
  "username",
  "email",
  "role",
  "status",
  "plan",
  "startDate",
  "tokenExpiry",
] as const;

type MockPreferenceColumnKey = (typeof MOCK_PREFERENCE_COLUMNS)[number];

interface MockPreferencesState {
  columnVisibility: Record<MockPreferenceColumnKey, boolean>;
  columnOrder: MockPreferenceColumnKey[];
}

function createDefaultMockPreferencesState(): MockPreferencesState {
  return {
    columnVisibility: {
      username: true,
      email: true,
      role: true,
      status: true,
      plan: true,
      startDate: true,
      tokenExpiry: true,
    },
    columnOrder: [...MOCK_PREFERENCE_COLUMNS],
  };
}

function buildAccessToken(subject: string = "qa-admin-user"): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      sub: subject,
    })
  ).toString("base64url");

  return `qa.${payload}.sig`;
}

function createMockUser(roleName: RoleName, identity?: Partial<MockAccountIdentity>) {
  const resolvedId = identity?.id ?? `qa-${roleName}-user`;
  const resolvedUsername = identity?.username ?? `qa-${roleName}`;
  const resolvedEmail = identity?.email ?? `qa-${roleName}@example.com`;

  return {
    id: resolvedId,
    username: resolvedUsername,
    email: resolvedEmail,
    roles_id: roleName === "admin" ? 1 : roleName === "pro" ? 3 : 2,
    role_name: roleName,
    token_id: identity?.tokenId ?? `qa-admin-token-${resolvedId}`,
    settings_icons_id: null,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
  };
}

async function seedRefreshSession(
  page: import("@playwright/test").Page,
  baseURL: string,
  refreshToken: string = REFRESH_TOKEN
): Promise<void> {
  await page.context().addCookies([
    {
      name: "refreshToken",
      value: refreshToken,
      url: baseURL,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript((token) => {
    localStorage.setItem("refreshToken", token);
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
  }, refreshToken);
}

async function clearRoleHintCookie(page: import("@playwright/test").Page, baseURL: string): Promise<void> {
  await page.context().addCookies([
    {
      name: "userRole",
      value: "",
      url: baseURL,
      expires: 0,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript(() => {
    localStorage.removeItem("userRole");
  });
}

async function seedRoleHintCookie(
  page: import("@playwright/test").Page,
  baseURL: string,
  role: RoleName
): Promise<void> {
  await page.context().addCookies([
    {
      name: "userRole",
      value: role,
      url: baseURL,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript((roleValue) => {
    localStorage.setItem("userRole", roleValue);
  }, role);
}

async function applyClientAdminSession(
  page: import("@playwright/test").Page,
  baseURL: string,
  refreshToken: string
): Promise<void> {
  await page.context().addCookies([
    {
      name: "refreshToken",
      value: refreshToken,
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

  await page.evaluate((token) => {
    localStorage.setItem("refreshToken", token);
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
    localStorage.setItem("userRole", "admin");
  }, refreshToken);
}

async function mockRefreshAuth(
  page: import("@playwright/test").Page,
  roleName: RoleName,
  identity?: Partial<MockAccountIdentity>
): Promise<void> {
  const accessToken = buildAccessToken(identity?.id ?? `qa-${roleName}-user`);

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken,
          user: createMockUser(roleName, identity),
        },
      }),
    });
  });
}

async function mockRefreshAuthSwitchable(
  page: import("@playwright/test").Page,
  resolveIdentity: () => MockAccountIdentity
): Promise<void> {
  await page.route("**/api/auth/refresh", async (route) => {
    const identity = resolveIdentity();
    const accessToken = buildAccessToken(identity.id);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken,
          user: createMockUser("admin", identity),
        },
      }),
    });
  });
}

async function activateAdminDetails(page: import("@playwright/test").Page): Promise<void> {
  await page.keyboard.press("Shift");
}

async function mockAdminApis(
  page: import("@playwright/test").Page,
  options: {
    statusCode?: 200 | 401 | 403;
    metricsRequests?: string[];
    usersRequests?: string[];
    subscriptionsRequests?: string[];
    preferencesRequests?: string[];
    resolvePreferencesAccountKey?: () => string | undefined;
    usersTotalPages?: number;
    subscriptionsTotalPages?: number;
    metricsMode?: "default" | "empty";
    requireAuthHeader?: boolean;
  } = {}
): Promise<void> {
  const statusCode = options.statusCode ?? 200;
  const preferencesStateByAccount = new Map<string, MockPreferencesState>();

  const resolvePreferencesAccountKey = (request: import("@playwright/test").Request): string => {
    const authHeader = request.headers()["authorization"];
    if (!authHeader) {
      return options.resolvePreferencesAccountKey?.() ?? "default";
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const encodedPayload = token.split(".")[1];

    if (!encodedPayload) {
      return token;
    }

    try {
      const normalizedPayload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
      const padding = "=".repeat((4 - (normalizedPayload.length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(`${normalizedPayload}${padding}`, "base64").toString("utf8")) as {
        sub?: unknown;
      };

      if (typeof payload.sub === "string" && payload.sub.trim().length > 0) {
        return payload.sub;
      }

      return options.resolvePreferencesAccountKey?.() ?? token;
    } catch {
      return options.resolvePreferencesAccountKey?.() ?? token;
    }
  };

  const getPreferencesStateForRequest = (request: import("@playwright/test").Request): MockPreferencesState => {
    const accountKey = resolvePreferencesAccountKey(request);
    const existingState = preferencesStateByAccount.get(accountKey);
    if (existingState) {
      return existingState;
    }

    const initialState = createDefaultMockPreferencesState();
    preferencesStateByAccount.set(accountKey, initialState);
    return initialState;
  };

  await page.route("**/api/admin/preferences**", async (route) => {
    const request = route.request();
    options.preferencesRequests?.push(request.url());
    const preferencesState = getPreferencesStateForRequest(request);

    const hasAuthorizationHeader = Boolean(request.headers()["authorization"]?.trim());
    if (options.requireAuthHeader && !hasAuthorizationHeader) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "SESSION_EXPIRED",
        }),
      });
      return;
    }

    if (statusCode !== 200) {
      await route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: statusCode === 401 ? "SESSION_EXPIRED" : "FORBIDDEN",
        }),
      });
      return;
    }

    if (request.method() === "PATCH" || request.method() === "PUT") {
      const body = request.postDataJSON() as {
        columnVisibility?: Partial<Record<MockPreferenceColumnKey, boolean>>;
        columnOrder?: Array<MockPreferenceColumnKey>;
      };

      if (body?.columnVisibility) {
        const nextVisibility = { ...preferencesState.columnVisibility };
        for (const [key, value] of Object.entries(body.columnVisibility)) {
          if (MOCK_PREFERENCE_COLUMNS.includes(key as MockPreferenceColumnKey) && typeof value === "boolean") {
            nextVisibility[key as MockPreferenceColumnKey] = value;
          }
        }

        if (Object.values(nextVisibility).some(Boolean)) {
          preferencesState.columnVisibility = nextVisibility;
        }
      }

      if (Array.isArray(body?.columnOrder) && body.columnOrder.length > 0) {
        const uniqueOrder = body.columnOrder.filter((item, idx, arr) =>
          MOCK_PREFERENCE_COLUMNS.includes(item) && arr.indexOf(item) === idx
        );

        if (uniqueOrder.length > 0) {
          for (const column of MOCK_PREFERENCE_COLUMNS) {
            if (!uniqueOrder.includes(column)) {
              uniqueOrder.push(column);
            }
          }
          preferencesState.columnOrder = uniqueOrder;
        }
      }
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: preferencesState,
        pagination: null,
        filtersApplied: {},
        generatedAt: new Date().toISOString(),
      }),
    });
  });

  await page.route("**/api/admin/users**", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    options.usersRequests?.push(requestUrl.toString());

    const hasAuthorizationHeader = Boolean(request.headers()["authorization"]?.trim());
    if (options.requireAuthHeader && !hasAuthorizationHeader) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "SESSION_EXPIRED",
        }),
      });
      return;
    }

    if (statusCode !== 200) {
      await route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: statusCode === 401 ? "SESSION_EXPIRED" : "FORBIDDEN",
        }),
      });
      return;
    }

    const pageParam = Number(requestUrl.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(requestUrl.searchParams.get("pageSize") ?? "20");
    const usersTotalPages = Math.max(1, options.usersTotalPages ?? 1);

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
          total: usersTotalPages * pageSizeParam,
          totalPages: usersTotalPages,
          hasNext: pageParam < usersTotalPages,
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
    const request = route.request();
    const requestUrl = new URL(request.url());
    options.subscriptionsRequests?.push(requestUrl.toString());

    const hasAuthorizationHeader = Boolean(request.headers()["authorization"]?.trim());
    if (options.requireAuthHeader && !hasAuthorizationHeader) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "SESSION_EXPIRED",
        }),
      });
      return;
    }

    if (statusCode !== 200) {
      await route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: statusCode === 401 ? "SESSION_EXPIRED" : "FORBIDDEN",
        }),
      });
      return;
    }

    const pageParam = Number(requestUrl.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(requestUrl.searchParams.get("pageSize") ?? "20");
    const subscriptionsTotalPages = Math.max(1, options.subscriptionsTotalPages ?? 1);

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
          total: subscriptionsTotalPages * pageSizeParam,
          totalPages: subscriptionsTotalPages,
          hasNext: pageParam < subscriptionsTotalPages,
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
    const request = route.request();
    const requestUrl = new URL(request.url());
    options.metricsRequests?.push(requestUrl.toString());

    const hasAuthorizationHeader = Boolean(request.headers()["authorization"]?.trim());
    if (options.requireAuthHeader && !hasAuthorizationHeader) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "SESSION_EXPIRED",
        }),
      });
      return;
    }

    if (statusCode !== 200) {
      await route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: statusCode === 401 ? "SESSION_EXPIRED" : "FORBIDDEN",
        }),
      });
      return;
    }

    const granularity = requestUrl.searchParams.get("granularity") ?? "day";
    const metricsMode = options.metricsMode ?? "default";

    const metricsData = metricsMode === "empty"
      ? {
          kpis: {
            registrations: 0,
            salesCount: 0,
            grossRevenue: 0,
            netRevenue: 0,
          },
          timeseries: [],
        }
      : {
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
        };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: metricsData,
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

test.describe("Admin panel QA regression", () => {
  test("admin can load panel and keep filters synced with metrics API", async ({ page, baseURL }) => {
    const metricsRequests: string[] = [];
    const usersRequests: string[] = [];
    const subscriptionsRequests: string[] = [];

    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page, { metricsRequests, usersRequests, subscriptionsRequests });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: /panel de administracion/i })).toBeVisible();
    await activateAdminDetails(page);

    const chart = page.locator("[data-chart]").first();
    await expect(chart).toBeVisible();
    await expect(chart.getByText("Suscripciones").first()).toBeVisible();
    await expect(chart.getByText("Registros").first()).toBeVisible();
    await expect(chart.getByText("Ingresos").first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Usuarios" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Suscripciones", exact: true })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Columnas" })).toBeVisible();

    await expect.poll(() => metricsRequests.length).toBeGreaterThan(0);
    await expect.poll(() => usersRequests.length).toBeGreaterThan(0);
    await expect.poll(() => subscriptionsRequests.length).toBeGreaterThan(0);

    await page.getByLabel("Plan").selectOption("pro");
    await expect(page).toHaveURL(/planType=pro/);
    await expect.poll(() => subscriptionsRequests.length).toBeGreaterThan(0);
    await expect
      .poll(() => subscriptionsRequests[subscriptionsRequests.length - 1] ?? "")
      .toContain("planType=pro");

    await page.getByPlaceholder("Buscar usuario o email").fill("adm");
    await expect(page).toHaveURL(/search=adm/);
    await expect
      .poll(() => usersRequests[usersRequests.length - 1] ?? "")
      .toContain("search=adm");

    await page.getByLabel("Granularidad").selectOption("custom");
    await expect(page).toHaveURL(/granularity=custom/);
    await expect(page).toHaveURL(/from=/);
    await expect(page).toHaveURL(/to=/);

    await expect
      .poll(() => metricsRequests[metricsRequests.length - 1] ?? "")
      .toContain("granularity=custom");
    await expect
      .poll(() => metricsRequests[metricsRequests.length - 1] ?? "")
      .toContain("from=");
    await expect
      .poll(() => metricsRequests[metricsRequests.length - 1] ?? "")
      .toContain("to=");
  });

  test("unauthenticated direct access to /admin redirects to login", async ({ page }) => {
    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/es\/auth\/login(?:\?|$)/);
  });

  test("non-admin direct access to /admin redirects away from admin route", async ({ page, baseURL }) => {
    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "user");
    await mockRefreshAuth(page, "user");
    await mockAdminApis(page, { statusCode: 403 });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/es\/icons(?:\?|$)/);
  });

  test("expired admin API session redirects to login with controlled feedback", async ({ page, baseURL }) => {
    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page, { statusCode: 401 });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect(page).toHaveURL(/\/es\/auth\/login(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: /iniciar sesión|sign in/i })).toBeVisible();
  });

  test("admin keeps session when refresh token resolves slower than dashboard hydration", async ({ page, baseURL }) => {
    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");

    const delayedAccessToken = buildAccessToken("qa-admin-slow-refresh");
    await page.route("**/api/auth/refresh", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3800));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: delayedAccessToken,
            user: createMockUser("admin", {
              id: "qa-admin-slow-refresh",
              username: "qa-admin-slow-refresh",
              email: "qa-admin-slow-refresh@example.com",
              tokenId: "qa-admin-slow-refresh-token",
            }),
          },
        }),
      });
    });

    await mockAdminApis(page, { requireAuthHeader: true });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect(page).toHaveURL(/\/es\/admin(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: /panel de administracion/i })).toBeVisible();
    await expect(page.getByRole("cell", { name: "admin-visible-1", exact: true })).toBeVisible();
  });

  test("admin panel keeps responsive layout without horizontal overflow", async ({ page, baseURL }) => {
    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page);

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);
    const chart = page.locator("[data-chart]").first();
    await expect(chart).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth);
    });

    expect(overflow).toBeLessThanOrEqual(4);

    await expect(page.getByPlaceholder("Buscar usuario o email")).toBeVisible();
    await expect(page.getByLabel("Rol")).toBeVisible();
    await expect(page.getByLabel("Estado de suscripcion")).toBeVisible();
    await expect(page.getByLabel("Plan")).toBeVisible();
    await expect(page.getByLabel("Granularidad")).toBeVisible();
    await expect(page.getByRole("button", { name: "Columnas" })).toBeVisible();
    await expect(chart.getByText("Suscripciones").first()).toBeVisible();
    await expect(chart.getByText("Registros").first()).toBeVisible();
    await expect(chart.getByText("Ingresos").first()).toBeVisible();

    const chartOverflow = await chart.evaluate((node) => {
      const element = node as HTMLElement;
      return Math.max(element.scrollWidth - element.clientWidth, 0);
    });

    expect(chartOverflow).toBeLessThanOrEqual(4);
  });

  test("admin table supports toggling visible columns", async ({ page, baseURL }) => {
    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page);

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toBeVisible();

    await page.getByRole("button", { name: "Columnas" }).click();
    const startDateToggle = page.getByLabel(/inicio|start date/i);
    await startDateToggle.uncheck();

    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toHaveCount(0);

    await startDateToggle.check();

    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toBeVisible();
  });

  test("admin table keeps selected columns after reload", async ({ page, baseURL }) => {
    const preferencesRequests: string[] = [];

    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page, {
      preferencesRequests,
      resolvePreferencesAccountKey: () => activeAccount.id,
    });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toBeVisible();

    await page.getByRole("button", { name: "Columnas" }).click();
    await page.getByLabel(/inicio|start date/i).click();
    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toHaveCount(0);
    await expect.poll(() => preferencesRequests.length).toBeGreaterThan(1);

    await page.reload({ waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect.poll(() => preferencesRequests.length).toBeGreaterThan(2);
    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toHaveCount(0);
  });

  test("admin column preferences persist across relogin and stay isolated per account", async ({ page, baseURL }) => {
    const preferencesRequests: string[] = [];
    const adminAccountA: MockAccountIdentity = {
      id: "qa-admin-a",
      username: "qa-admin-a",
      email: "qa-admin-a@example.com",
      tokenId: "qa-admin-token-a",
    };
    const adminAccountB: MockAccountIdentity = {
      id: "qa-admin-b",
      username: "qa-admin-b",
      email: "qa-admin-b@example.com",
      tokenId: "qa-admin-token-b",
    };

    let activeAccount: MockAccountIdentity = adminAccountA;

    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!, "qa-refresh-token-admin-a");
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuthSwitchable(page, () => activeAccount);
    await mockAdminApis(page, { preferencesRequests });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toBeVisible();

    await page.getByRole("button", { name: "Columnas" }).click();
    await page.getByLabel(/inicio|start date/i).click();

    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toHaveCount(0);
    await expect.poll(() => preferencesRequests.length).toBeGreaterThan(1);

    await page.reload({ waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);
    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toHaveCount(0);

    await page.goto("/es/admin?usersPage=2&role=admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);
    await expect(page).toHaveURL(/usersPage=2/);
    await expect(page).toHaveURL(/role=admin/);
    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toHaveCount(0);

    await page.evaluate(() => {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("refreshTokenExpiry");
      localStorage.removeItem("userRole");
      document.cookie = "refreshToken=; Path=/; Max-Age=0; SameSite=Lax";
      document.cookie = "userRole=; Path=/; Max-Age=0; SameSite=Lax";
    });

    activeAccount = adminAccountA;
    await applyClientAdminSession(page, baseURL!, "qa-refresh-token-admin-a");
    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);
    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toHaveCount(0);

    activeAccount = adminAccountB;
    await applyClientAdminSession(page, baseURL!, "qa-refresh-token-admin-b");
    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);
    await expect(page.getByRole("columnheader", { name: /inicio|start date/i })).toBeVisible();
  });

  test("admin metrics empty state appears when API returns no timeseries", async ({ page, baseURL }) => {
    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page, { metricsMode: "empty" });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect(page.getByText("No hay datos suficientes para graficar metricas en el rango actual.")).toBeVisible();
    await expect(page.locator("[data-chart]")).toHaveCount(0);
  });

  test("pagination updates table data without full page remount", async ({ page, baseURL }) => {
    const usersRequests: string[] = [];

    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page, {
      usersRequests,
      usersTotalPages: 2,
      subscriptionsTotalPages: 1,
    });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect.poll(() => usersRequests.length).toBeGreaterThan(0);
    await expect(page.getByRole("cell", { name: "admin-visible-1", exact: true })).toBeVisible();
    await page.evaluate(() => {
      window.scrollTo(0, 420);
      (window as typeof window & { __adminMarker?: string }).__adminMarker = "keep-instance";
    });

    await page.getByRole("button", { name: "Siguiente" }).first().click();
    await expect(page.getByRole("cell", { name: "admin-visible-2", exact: true })).toBeVisible();

    const remountState = await page.evaluate(() => {
      return {
        marker: (window as typeof window & { __adminMarker?: string }).__adminMarker,
        scrollY: window.scrollY,
        navigations: performance.getEntriesByType("navigation").length,
      };
    });

    expect(remountState.marker).toBe("keep-instance");
    expect(remountState.scrollY).toBeGreaterThan(300);
    expect(remountState.navigations).toBe(1);

    await expect
      .poll(() => usersRequests[usersRequests.length - 1] ?? "")
      .toContain("page=2");
  });

  test("browser back/forward keeps admin query-state in sync", async ({ page, baseURL }) => {
    const usersRequests: string[] = [];

    await clearRoleHintCookie(page, baseURL!);
    await seedRefreshSession(page, baseURL!);
    await seedRoleHintCookie(page, baseURL!, "admin");
    await mockRefreshAuth(page, "admin");
    await mockAdminApis(page, {
      usersRequests,
      usersTotalPages: 2,
      subscriptionsTotalPages: 2,
    });

    await page.goto("/es/admin", { waitUntil: "domcontentloaded" });
    await activateAdminDetails(page);

    await expect(page.getByRole("cell", { name: "admin-visible-1", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Siguiente" }).first().click();
    await expect(page).toHaveURL(/usersPage=2/);
    await expect(page.getByRole("cell", { name: "admin-visible-2", exact: true })).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/usersPage=2/);
    await expect(page.getByRole("cell", { name: "admin-visible-1", exact: true })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/usersPage=2/);
    await expect(page.getByRole("cell", { name: "admin-visible-2", exact: true })).toBeVisible();

    await expect.poll(() => usersRequests.some((url) => url.includes("page=2"))).toBeTruthy();
  });
});
