import { NextRequest, NextResponse } from "next/server";
import { PROTECTED_ROUTES, AUTH_ROUTES } from "@/utils/constants";

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.trim().split("=");
    if (parts.length === 2 && parts[0] && parts[1]) {
      cookies[parts[0]] = parts[1];
    }
  });
  return cookies;
}

function mergeCookies(
  existingCookies: string,
  newCookies: Array<string>,
): string {
  const existing = parseCookieHeader(existingCookies);
  const merged = { ...existing };

  newCookies.forEach((newCookie) => {
    const setCookiePart = newCookie.split(";")[0];
    if (setCookiePart) {
      const parts = setCookiePart.trim().split("=");
      if (parts.length === 2 && parts[0] && parts[1]) {
        merged[parts[0]] = parts[1];
      }
    }
  });

  return Object.entries(merged)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function checkAuth(request: NextRequest): Promise<boolean> {
  try {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const cookies = request.cookies.toString();
    console.log("[Middleware] Checking auth, has cookies:", !!cookies, "has accessToken:", cookies.includes("accessToken"));

    if (!cookies || !cookies.includes("accessToken")) {
      console.log("[Middleware] No accessToken found");
      return false;
    }

    try {
      let response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "POST",
        headers: {
          Cookie: cookies,
          "Content-Type": "application/json",
        },
      });

      if (
        !response.ok &&
        response.status === 401 &&
        cookies.includes("refreshToken")
      ) {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            Cookie: cookies,
            "Content-Type": "application/json",
            "x-remember-me": "false",
          },
        });

        if (refreshResponse.ok) {
          const setCookieHeader = refreshResponse.headers.get("set-cookie");
          if (setCookieHeader) {
            const cookieStrings = setCookieHeader
              .split(",")
              .map((cookie) => cookie.trim());
            const updatedCookies = mergeCookies(cookies, cookieStrings);

            response = await fetch(`${API_BASE_URL}/auth/profile`, {
              method: "POST",
              headers: {
                Cookie: updatedCookies,
                "Content-Type": "application/json",
              },
            });
          }
        }
      }

      console.log("[Middleware] Profile check result:", response.ok);
      return response.ok;
    } catch (apiError) {
      console.error("[Middleware] API auth check failed:", apiError);
      return false;
    }
  } catch (error) {
    console.error("[Middleware] Error checking auth:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const isAuthenticated = await checkAuth(request);

    console.log("isAuthenticated middleware", isAuthenticated);

    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isAuthRoute) {
    const isAuthenticated = await checkAuth(request);

    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
