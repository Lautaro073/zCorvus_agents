import { expect, test } from "@playwright/test";

type ThemeMode = "light" | "dark";

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    {
      name: "refreshToken",
      value: "qa-refresh-token",
      url: baseURL!,
      sameSite: "Lax",
    },
  ]);

  await page.addInitScript(() => {
    localStorage.setItem("refreshToken", "qa-refresh-token");
    localStorage.setItem("refreshTokenExpiry", new Date(Date.now() + 60 * 60 * 1000).toISOString());
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: "qa.token.sig",
          user: {
            id: "qa-user",
            username: "premium-mobile-visual-user",
            email: "qa@example.com",
            roles_id: 3,
            role_name: "pro",
            token_id: "qa-token-id",
            settings_icons_id: null,
            two_factor_enabled: true,
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
});

async function seedTheme(page: import("@playwright/test").Page, baseURL: string, theme: ThemeMode) {
  await page.context().addCookies([
    {
      name: "user_prefs",
      value: JSON.stringify({ theme, iconSet: "core", layer: "expanded" }),
      url: baseURL,
      sameSite: "Lax",
    },
  ]);
}

for (const theme of ["light", "dark"] as const) {
  test(`authenticated home header stays inside viewport (${theme})`, async ({ page, baseURL }) => {
    await seedTheme(page, baseURL!, theme);
    await page.goto("/es", { waitUntil: "networkidle" });

    const trigger = page.getByRole("button", { name: "User profile" });
    await expect(trigger).toBeVisible();

    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();

    const viewport = page.viewportSize()!;
    expect(triggerBox!.x).toBeGreaterThanOrEqual(0);
    expect(triggerBox!.y).toBeGreaterThanOrEqual(0);
    expect(triggerBox!.x + triggerBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(triggerBox!.y + triggerBox!.height).toBeLessThanOrEqual(viewport.height);

    await trigger.click();

    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();

    const popoverBox = await popover.boundingBox();
    expect(popoverBox).not.toBeNull();
    expect(popoverBox!.x).toBeGreaterThanOrEqual(0);
    expect(popoverBox!.y).toBeGreaterThanOrEqual(0);
    expect(popoverBox!.x + popoverBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(popoverBox!.y + popoverBox!.height).toBeLessThanOrEqual(viewport.height);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return Math.max(doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth);
    });

    expect(overflow).toBeLessThanOrEqual(4);
  });
}
