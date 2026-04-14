import { NextRequest, NextResponse } from "next/server";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "@/utils/constants";

type AuthCheckResult = {
  authenticated: boolean;
  /**
   * Set-Cookie headers renvoyés par l'API quand un refresh a réussi côté
   * serveur. Le proxy doit les attacher au NextResponse pour que le navigateur
   * reçoive les nouveaux tokens — sans ça, le client garde son ancien access
   * token expiré et la prochaine requête XHR repart en 401.
   */
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

/**
 * Récupère les Set-Cookie d'une réponse fetch sous forme de tableau, en gérant
 * la différence entre `Headers.getSetCookie()` (Node récent / Edge) et le
 * fallback `headers.raw()` ou parsing manuel.
 */
function extractSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  // Fallback : on lit les valeurs séparées via l'itérateur. Note: en
  // environnement Node sans support natif, plusieurs Set-Cookie peuvent être
  // joints par une virgule, ce qui est ambigu. C'est rare en pratique sur les
  // runtimes Next.js modernes, mais on ne casse pas pour autant.
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
      // Pas d'access token mais peut-être un refresh token (cas du cookie de
      // session expiré côté browser après la fermeture de l'onglet) → on tente
      // quand même un refresh si l'utilisateur a un refreshToken.
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

/**
 * Tente un refresh côté serveur et, en cas de succès, revérifie le profil avec
 * les nouveaux cookies. Retourne les Set-Cookie pour qu'ils soient propagés au
 * NextResponse.
 */
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

    // Important : on vérifie que le refresh donne bien accès au profil avec
    // les NOUVEAUX cookies. Sinon on signalerait un faux positif.
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

/**
 * Reconstruit un header Cookie en remplaçant les valeurs d'accessToken /
 * refreshToken par celles renvoyées dans les Set-Cookie du refresh response.
 */
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
    // Format: "name=value; Path=/; HttpOnly; ..."
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

/**
 * Applique les Set-Cookie venus du refresh à un NextResponse pour que le
 * navigateur reçoive les nouveaux tokens.
 */
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
