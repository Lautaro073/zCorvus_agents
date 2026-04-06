import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

type ThemeMode = "light" | "dark";
type AccessMode = "public" | "auth" | "premium" | "premium-success";

type RouteCase = {
  slug: string;
  url: string;
  access: AccessMode;
  waitFor: (page: import("@playwright/test").Page) => Promise<void>;
};

const BASE_URL = "http://127.0.0.1:3100";
const OUTPUT_ROOT = path.resolve(process.cwd(), "test-results", "visual-regression-deep");

const routeCases: RouteCase[] = [
  {
    slug: "home",
    url: "/es",
    access: "public",
    waitFor: async (page) => {
      await expect(page.getByRole("heading", { level: 2, name: "Z-ICONS" })).toBeVisible();
    },
  },
  {
    slug: "icons-index",
    url: "/es/icons",
    access: "public",
    waitFor: async (page) => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    },
  },
  {
    slug: "icons-local-all",
    url: "/es/icons/local/all",
    access: "public",
    waitFor: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: /local/i })).toBeVisible();
      await expect(page.getByPlaceholder(/buscar|search/i)).toBeVisible();
    },
  },
  {
    slug: "icons-premium-all",
    url: "/es/icons/premium/all",
    access: "public",
    waitFor: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: /premium/i })).toBeVisible();
      await expect(page.getByPlaceholder(/buscar|search/i)).toBeVisible();
    },
  },
  {
    slug: "icons-local-core",
    url: "/es/icons/local/core",
    access: "public",
    waitFor: async (page) => {
      await expect(page.getByPlaceholder(/buscar|search/i)).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: /core/i })).toBeVisible();
    },
  },
  {
    slug: "icons-premium-fa-solid",
    url: "/es/icons/premium/fa-solid",
    access: "premium",
    waitFor: async (page) => {
      await expect(page.getByPlaceholder(/buscar|search/i)).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: /fa-solid/i })).toBeVisible();
    },
  },
  {
    slug: "premium",
    url: "/es/premium",
    access: "public",
    waitFor: async (page) => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button").first()).toBeVisible();
    },
  },
  {
    slug: "premium-success",
    url: "/es/premium/success?session_id=qa-session",
    access: "premium-success",
    waitFor: async (page) => {
      await expect(page.getByText("qa-session")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    },
  },
  {
    slug: "premium-cancel",
    url: "/es/premium/cancel",
    access: "public",
    waitFor: async (page) => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: /intentar nuevamente|try again/i })).toBeVisible();
    },
  },
  {
    slug: "auth-login",
    url: "/es/auth/login",
    access: "auth",
    waitFor: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: /iniciar sesi[oó]n/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /iniciar sesi[oó]n/i })).toBeVisible();
    },
  },
];

function buildAccessToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 })
  ).toString("base64url");

  return `qa.${payload}.sig`;
}

async function seedTheme(
  page: import("@playwright/test").Page,
  theme: ThemeMode
): Promise<void> {
  await page.context().addCookies([
    {
      name: "user_prefs",
      value: JSON.stringify({ theme, iconSet: "core", layer: "expanded" }),
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);
}

async function seedAuthenticatedSession(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("refreshToken", "qa-refresh-token");
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
  });

  await page.context().addCookies([
    {
      name: "refreshToken",
      value: "qa-refresh-token",
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);
}

async function mockPremiumApis(page: import("@playwright/test").Page): Promise<void> {
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
            token: "qa_visual_audit_token",
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

async function prepareRoute(
  page: import("@playwright/test").Page,
  theme: ThemeMode,
  access: AccessMode
): Promise<void> {
  await seedTheme(page, theme);

  if (access === "premium" || access === "premium-success") {
    await seedAuthenticatedSession(page);
    await mockPremiumApis(page);
  }
}

async function disableVisualNoise(page: import("@playwright/test").Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      nextjs-portal,
      [data-next-badge-root],
      [data-nextjs-toast],
      [data-next-mark],
      #__next-build-watcher,
      #nextjs__container {
        display: none !important;
      }
    `,
  });
}

function getScreenshotPath(projectName: string, theme: ThemeMode, slug: string): string {
  return path.join(OUTPUT_ROOT, projectName, theme, `${slug}.png`);
}

test.describe("Frontend visual regression deep audit", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const routeCase of routeCases) {
      test(`${theme} ${routeCase.slug}`, async ({ page }, testInfo) => {
        await prepareRoute(page, theme, routeCase.access);

        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        await page.goto(routeCase.url, { waitUntil: "domcontentloaded" });
        await disableVisualNoise(page);
        await routeCase.waitFor(page);

        await expect(page.locator("html")).toHaveClass(
          theme === "dark" ? /\bdark\b/ : /\blight\b/
        );

        await page.waitForTimeout(150);

        const metrics = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            docClientWidth: doc.clientWidth,
            docScrollWidth: doc.scrollWidth,
            bodyClientWidth: body.clientWidth,
            bodyScrollWidth: body.scrollWidth,
            theme: doc.className,
            pathname: window.location.pathname + window.location.search,
            horizontalOverflow: Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth),
          };
        });

        const screenshotPath = getScreenshotPath(testInfo.project.name, theme, routeCase.slug);
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        await page.screenshot({ path: screenshotPath, fullPage: true });

        await testInfo.attach(`metrics-${routeCase.slug}-${theme}.json`, {
          body: Buffer.from(JSON.stringify(metrics, null, 2)),
          contentType: "application/json",
        });

        if (consoleErrors.length > 0) {
          await testInfo.attach(`console-errors-${routeCase.slug}-${theme}.txt`, {
            body: Buffer.from(consoleErrors.join("\n")),
            contentType: "text/plain",
          });
        }

        expect.soft(
          metrics.horizontalOverflow,
          `Horizontal overflow detected on ${routeCase.slug} (${theme}, ${testInfo.project.name})`
        ).toBeLessThanOrEqual(4);
      });
    }
  }
});
