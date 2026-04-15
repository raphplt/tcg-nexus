import { NextRequest, NextResponse } from "next/server";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "@/utils/constants";

type AuthCheckResult = {
  authenticated: boolean;
  refreshedCookies?: string[];
};

function resolveApiBaseUrl(request: NextRequest): string {
  const internalUrl = process.env.API_INTERNAL_URL;
  if (internalUrl) {
    return internalUrl;
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (envUrl) {
    if (envUrl.startsWith("http")) {
      return envUrl;
    }

    if (envUrl.startsWith("/")) {
      return `${request.nextUrl.origin}${envUrl}`;
    }
  }

  if (process.env.NODE_ENV === "production") {
    return `${request.nextUrl.origin}/api`;
  }

  return "http://localhost:3001";
}

function buildCookieHeader(request: NextRequest): string {
  const parts = request.cookies.getAll().map((c) => `${c.name}=${c.value}`);
  return parts.join("; ");
}

function extractSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  // Fallback
  const result: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      result.push(value);
    }
  });
  return result;
}

async function checkAuth(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const API_BASE_URL = resolveApiBaseUrl(request);
    const cookies = buildCookieHeader(request);

    if (!cookies || !cookies.includes("accessToken")) {
      if (cookies && cookies.includes("refreshToken")) {
        return await tryRefreshAndProfile(API_BASE_URL, cookies);
      }
      return { authenticated: false };
    }

    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "POST",
      headers: {
        Cookie: cookies,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { authenticated: true };
    }

    if (response.status === 401 && cookies.includes("refreshToken")) {
      return await tryRefreshAndProfile(API_BASE_URL, cookies);
    }

    return { authenticated: false };
  } catch (error) {
    console.error("Error checking auth:", error);
    return { authenticated: false };
  }
}

async function tryRefreshAndProfile(
  API_BASE_URL: string,
  originalCookies: string,
): Promise<AuthCheckResult> {
  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: originalCookies,
        "Content-Type": "application/json",
      },
    });

    if (!refreshResponse.ok) {
      return { authenticated: false };
    }

    const refreshedCookies = extractSetCookies(refreshResponse);

    const newCookieHeader = mergeCookieHeader(
      originalCookies,
      refreshedCookies,
    );

    const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "POST",
      headers: {
        Cookie: newCookieHeader,
        "Content-Type": "application/json",
      },
    });

    if (!profileResponse.ok) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      refreshedCookies,
    };
  } catch (error) {
    console.error("Error during server-side refresh:", error);
    return { authenticated: false };
  }
}

function mergeCookieHeader(
  originalCookieHeader: string,
  setCookieHeaders: string[],
): string {
  const cookieMap = new Map<string, string>();

  for (const part of originalCookieHeader.split("; ")) {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    cookieMap.set(part.slice(0, eqIndex), part.slice(eqIndex + 1));
  }

  for (const setCookie of setCookieHeaders) {
    const firstSegment = setCookie.split(";")[0];
    if (!firstSegment) continue;
    const eqIndex = firstSegment.indexOf("=");
    if (eqIndex === -1) continue;
    const name = firstSegment.slice(0, eqIndex);
    const value = firstSegment.slice(eqIndex + 1);
    cookieMap.set(name, value);
  }

  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function applyRefreshedCookies(
  response: NextResponse,
  refreshedCookies: string[] | undefined,
): NextResponse {
  if (!refreshedCookies || refreshedCookies.length === 0) {
    return response;
  }
  for (const cookie of refreshedCookies) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  const result = await checkAuth(request);

  if (isProtectedRoute) {
    if (!result.authenticated) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return applyRefreshedCookies(NextResponse.next(), result.refreshedCookies);
  }

  // isAuthRoute
  if (result.authenticated) {
    const homeRedirect = NextResponse.redirect(new URL("/", request.url));
    return applyRefreshedCookies(homeRedirect, result.refreshedCookies);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
