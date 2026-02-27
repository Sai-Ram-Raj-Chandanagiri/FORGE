import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    // Should show some form of sign-in UI
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register/);

    // Step 1: Role selection — shows heading and two role options
    await expect(page.locator("h1")).toContainText("Join FORGE");
    await expect(page.getByRole("button", { name: /organisation/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /developer/i })).toBeVisible();
  });

  test("unauthenticated user is redirected from /dashboard to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from /settings to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from /admin to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from /agents to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/agents");
    await expect(page).toHaveURL(/\/login/);
  });
});
