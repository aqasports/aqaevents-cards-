import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isIpRateLimited, recordIpAttempt } from "@/lib/auth";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── IP rate limiting on the login endpoint ───────────────────────────────
  // Applied before the /admin auth check so it runs even for the login POST.
  // NextAuth's credentials callback is at /api/auth/callback/credentials.
  if (
    pathname === "/api/auth/callback/credentials" &&
    request.method === "POST"
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (ip !== "unknown" && isIpRateLimited(ip)) {
      console.warn(`[middleware] Login rate limit exceeded for IP: ${ip}`);
      return new NextResponse(
        JSON.stringify({ error: "Too many login attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store, max-age=0",
            "retry-after": "900",
          },
        }
      );
    }

    if (ip !== "unknown") {
      recordIpAttempt(ip);
    }
  }

  if (pathname.startsWith("/admin")) {
    // Fail loudly if NEXTAUTH_SECRET is not configured — prevents silent auth bypass.
    // A missing secret causes getToken() to return null for all requests, which would
    // make every /admin route appear authenticated. Throwing here makes the misconfiguration
    // visible in Netlify function logs instead of silently serving production data.
    if (!process.env.NEXTAUTH_SECRET) {
      console.error(
        "[middleware] NEXTAUTH_SECRET is not set. Admin routes are not safe to serve. " +
        "Set NEXTAUTH_SECRET in your Netlify environment variables."
      );
      return new NextResponse("Server misconfiguration: authentication secret is missing.", {
        status: 500,
        headers: { "cache-control": "no-store, max-age=0" },
      });
    }

    // If App-Only mode is enabled, enforce that the request comes from our official mobile/desktop app shell
    if (process.env.ENFORCE_ADMIN_APP === "true") {
      const appToken = request.headers.get("x-admin-app-token") || request.nextUrl.searchParams.get("app_token");
      const expectedToken = process.env.ADMIN_APP_TOKEN;

      if (!expectedToken || !appToken || !safeCompare(appToken, expectedToken)) {
        return new NextResponse(
          `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <title>Access Denied - AQA Sports</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  background: #0b0f19;
                  color: #f3f4f6;
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  overflow: hidden;
                }
                .card {
                  text-align: center;
                  padding: 2.5rem 2rem;
                  background: #111827;
                  border: 1px solid #1f2937;
                  border-radius: 16px;
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                  max-width: 420px;
                  width: 90%;
                  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .icon {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  width: 64px;
                  height: 64px;
                  border-radius: 50%;
                  background: rgba(239, 68, 68, 0.1);
                  color: #ef4444;
                  font-size: 2rem;
                  font-weight: bold;
                  margin-bottom: 1.5rem;
                }
                h1 {
                  font-size: 1.5rem;
                  font-weight: 700;
                  margin: 0 0 0.75rem 0;
                  color: #ffffff;
                  letter-spacing: -0.025em;
                }
                p {
                  color: #9ca3af;
                  line-height: 1.6;
                  font-size: 0.95rem;
                  margin: 0 0 1.5rem 0;
                }
                .badge {
                  display: inline-block;
                  padding: 0.375rem 0.75rem;
                  background: #1f2937;
                  color: #d1d5db;
                  border-radius: 9999px;
                  font-size: 0.8rem;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">✕</div>
                <h1>AQA Admin App Required</h1>
                <p>The AQA Sports Admin Portal is restricted to authorized app holders. Please open the official AQA Admin App to log in and manage the system.</p>
                <span class="badge">App-Only Mode Active</span>
              </div>
            </body>
          </html>`,
          {
            status: 403,
            headers: {
              "content-type": "text/html",
              "cache-control": "no-store, max-age=0",
            },
          }
        );
      }
    }

    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/auth/callback/credentials"],
};
