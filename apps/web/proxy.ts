import { NextRequest, NextResponse } from "next/server";
import { PROTECTED_ROUTES, AUTH_ROUTES } from "@/utils/constants";

function buildCookieHeader(request: NextRequest): string {
  const parts = request.cookies.getAll().map((c) => `${c.name}=${c.value}`);
  return parts.join("; ");
}

async function checkAuth(request: NextRequest): Promise<boolean> {
  try {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const cookies = buildCookieHeader(request);

    if (!cookies || !cookies.includes("accessToken")) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
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
          return true;
        }
      }

      return response.ok;
    } catch (apiError) {
      console.error("API auth check failed:", apiError);
      return false;
    }
  } catch (error) {
    console.error("Error checking auth:", error);
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const isAuthenticated = await checkAuth(request);

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
