import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import {
  DEFAULT_LOCALE,
  getLocaleFromPathname,
  type SupportedLocale,
  stripLocaleFromPathname,
} from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "@/utils/constants";
import { verifyAccessToken } from "@/utils/server-auth";

const intlMiddleware = createIntlMiddleware(routing);

type AuthCheckResult = {
  authenticated: boolean;
  refreshedCookies?: string[];
};

const refreshPromises = new Map<string, Promise<AuthCheckResult>>();

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

let missingSecretWarned = false;

/**
 * Checks the current access token, locally when the signing secret is shared
 * with the web app, otherwise by asking the API.
 *
 * @param token - Access token read from the request cookies.
 * @param apiBaseUrl - Base URL of the API.
 * @param cookies - Serialized request cookies forwarded to the API.
 * @returns Whether the session may access protected routes.
 */
async function isAccessTokenValid(
  token: string,
  apiBaseUrl: string,
  cookies: string,
): Promise<boolean> {
  const secret = process.env.JWT_SECRET;

  // Without the shared secret every token would look invalid and the proxy
  // would redirect all protected routes to the login page: fall back to the
  // API, which stays authoritative anyway.
  if (!secret) {
    if (!missingSecretWarned) {
      missingSecretWarned = true;
      console.warn(
        "JWT_SECRET is not set for the web app: falling back to an API call on every protected navigation. Set it to the same value as the API.",
      );
    }
    return verifySessionAgainstApi(apiBaseUrl, cookies);
  }

  return verifyAccessToken(token, secret);
}

async function verifySessionAgainstApi(
  apiBaseUrl: string,
  cookies: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/auth/profile`, {
      method: "POST",
      headers: {
        Cookie: cookies,
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error verifying the session against the API:", error);
    return false;
  }
}

async function checkAuth(request: NextRequest): Promise<AuthCheckResult> {
  try {
    const API_BASE_URL = resolveApiBaseUrl(request);
    const cookies = buildCookieHeader(request);
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (
      accessToken &&
      (await isAccessTokenValid(accessToken, API_BASE_URL, cookies))
    ) {
      return { authenticated: true };
    }

    if (refreshToken) {
      return await refreshOnce(API_BASE_URL, cookies, refreshToken);
    }

    return { authenticated: false };
  } catch (error) {
    console.error("Error checking auth:", error);
    return { authenticated: false };
  }
}

function refreshOnce(
  API_BASE_URL: string,
  originalCookies: string,
  refreshToken: string,
): Promise<AuthCheckResult> {
  const key = `${API_BASE_URL}\u0000${refreshToken}`;
  const pending = refreshPromises.get(key);
  if (pending) {
    return pending;
  }

  const promise = tryRefresh(API_BASE_URL, originalCookies).finally(() => {
    if (refreshPromises.get(key) === promise) {
      refreshPromises.delete(key);
    }
  });
  refreshPromises.set(key, promise);
  return promise;
}

async function tryRefresh(
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
    const accessCookie = refreshedCookies.find((cookie) =>
      cookie.startsWith("accessToken="),
    );
    const refreshedAccessToken = accessCookie?.split(";", 1)[0]?.split("=")[1];

    const secret = process.env.JWT_SECRET;

    if (!refreshedAccessToken) {
      return { authenticated: false };
    }

    // A successful refresh already proves the API accepted the session: the
    // local signature check is only an extra guard when the secret is known.
    if (secret && !(await verifyAccessToken(refreshedAccessToken, secret))) {
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

function localizedUrl(
  request: NextRequest,
  locale: SupportedLocale,
  pathnameWithoutLocale: string,
): URL {
  const normalized = pathnameWithoutLocale === "/" ? "" : pathnameWithoutLocale;
  return new URL(`/${locale}${normalized}`, request.url);
}

/**
 * Main middleware proxy handling internationalization routing and route authentication checks.
 *
 * @param request Incoming Next.js request.
 * @returns Response or redirect matching route access rules.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPathname(pathname);

  // Without locale prefix in pathname, next-intl resolves language and redirects.
  // Authentication check runs on subsequent localized request.
  if (!locale) {
    return intlMiddleware(request);
  }

  const basePathname = stripLocaleFromPathname(pathname);

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    basePathname.startsWith(route),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    basePathname.startsWith(route),
  );

  if (!isProtectedRoute && !isAuthRoute) {
    return intlMiddleware(request);
  }

  const result = await checkAuth(request);

  if (isProtectedRoute) {
    if (!result.authenticated) {
      const loginUrl = localizedUrl(request, locale, "/auth/login");
      loginUrl.searchParams.set(
        "redirect",
        `${pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(loginUrl);
    }

    return applyRefreshedCookies(
      intlMiddleware(request),
      result.refreshedCookies,
    );
  }

  if (result.authenticated) {
    const homeRedirect = NextResponse.redirect(
      localizedUrl(request, locale, "/"),
    );
    return applyRefreshedCookies(homeRedirect, result.refreshedCookies);
  }

  return intlMiddleware(request);
}

export default proxy;

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
