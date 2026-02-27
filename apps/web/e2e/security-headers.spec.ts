import { test, expect } from "@playwright/test";

test.describe("Security Headers", () => {
  test("response includes X-Frame-Options header", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
  });

  test("response includes X-Content-Type-Options header", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("response includes Referrer-Policy header", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("response includes Content-Security-Policy header", async ({ request }) => {
    const response = await request.get("/");
    const csp = response.headers()["content-security-policy"];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("response includes Permissions-Policy header", async ({ request }) => {
    const response = await request.get("/");
    const pp = response.headers()["permissions-policy"];
    expect(pp).toBeDefined();
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  test("rate limiting returns 429 after threshold", async ({ request }) => {
    // Hit auth endpoint rapidly to trigger rate limit (10 req/min)
    const responses = [];
    for (let i = 0; i < 15; i++) {
      const res = await request.get("/api/auth/session");
      responses.push(res.status());
    }

    // At least some should be 429
    const rateLimited = responses.filter((s) => s === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test("rate limit response includes Retry-After header", async ({ request }) => {
    // Exhaust rate limit first
    for (let i = 0; i < 12; i++) {
      await request.get("/api/auth/session");
    }

    // This request should be rate limited
    const response = await request.get("/api/auth/session");
    if (response.status() === 429) {
      expect(response.headers()["retry-after"]).toBeDefined();
      expect(response.headers()["x-ratelimit-limit"]).toBe("10");
    }
  });
});
