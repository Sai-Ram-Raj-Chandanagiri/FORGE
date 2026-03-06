import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  authLimiter,
  mutationLimiter,
  queryLimiter,
  getClientId,
} from "@/lib/rate-limiter";
import type { RateLimitResult } from "@/lib/rate-limiter";

/**
 * Composed middleware: Rate Limiting → Authentication.
 *
 * Uses getToken (instead of withAuth) so that rate limiting always runs first,
 * even for unauthenticated requests. Then checks auth for protected pages.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const clientId = getClientId(req);

  // ── 1. Rate limiting (API routes only) ──────────────────────────────
  if (pathname.startsWith("/api/")) {
    let result: RateLimitResult;

    if (pathname.startsWith("/api/auth/")) {
      result = authLimiter.check(clientId);
    } else if (pathname.startsWith("/api/trpc/") && req.method === "POST") {
      result = mutationLimiter.check(clientId);
    } else {
      result = queryLimiter.check(clientId);
    }

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

      return new NextResponse(
        JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
          },
        },
      );
    }

    // Rate limit passed — add headers and continue to route handler
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));
    return response;
  }

  // ── 2. Authentication (protected page routes) ──────────────────────
  const token = await getToken({ req });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected page routes (require auth)
    "/dashboard/:path*",
    "/store/:path*",
    "/link/:path*",
    "/hub/:path*",
    "/agents/:path*",
    "/settings/:path*",
    "/admin/:path*",
    // API routes (rate limiting only)
    "/api/auth/:path*",
    "/api/trpc/:path*",
  ],
};
