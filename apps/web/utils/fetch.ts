import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { NEXT_PUBLIC_API_URL } from "./variables";

export const API_BASE_URL =
  NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3001");

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

export const secureApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ---------------------------------------------------------------------------
// Intercepteur de refresh — filet de sécurité
//
// Principes :
// 1. Le refresh "proactif" côté client a été retiré : il s'appuyait sur un
//    setTimeout throttlé quand l'onglet passait en arrière-plan, ce qui laissait
//    l'utilisateur avec un token expiré. Le refresh est désormais piloté par le
//    middleware Next.js (pour les navigations) et par cet intercepteur (pour
//    les requêtes XHR qui reçoivent un 401).
// 2. Une seule Promise `refreshPromise` sert de mutex naturel : toutes les
//    requêtes qui reçoivent un 401 en même temps attendent le même refresh. Pas
//    de file d'attente manuelle, pas d'état dupliqué.
// 3. Les routes d'auth (`/auth/login`, `/auth/register`, `/auth/logout`,
//    `/auth/refresh`) ne déclenchent jamais de refresh automatique sur 401,
//    sinon on s'enferme dans des boucles.
// ---------------------------------------------------------------------------

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

const AUTH_ROUTES_SKIPPING_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/refresh",
];

let refreshPromise: Promise<void> | null = null;

/**
 * Déclenche un refresh et partage la Promise en cours entre tous les appelants
 * concurrents. Remise à null dès que la requête se termine (succès ou échec),
 * pour que le prochain 401 puisse retenter.
 */
const refreshOnce = (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = secureApi
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

secureApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";
    const isAuthRoute = AUTH_ROUTES_SKIPPING_REFRESH.some((route) =>
      url.includes(route),
    );
    if (isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshOnce();
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }

    return secureApi(originalRequest);
  },
);

/**
 * Fonction fetcher générique pour Tanstack Query (compatible avec axios et sécurisée)
 * @param url L'URL relative de l'API (ex: /tournaments)
 * @param config Config axios optionnelle (params, headers...)
 * @returns Les données de la réponse (response.data)
 * @throws L'erreur axios si la requête échoue
 *
 * Utilisation :
 * const { data } = useQuery({ queryKey: ['tournaments'], queryFn: () => fetcher('/tournaments') })
 */
export async function fetcher<T = unknown>(
  url: string,
  config?: Record<string, unknown>,
): Promise<T> {
  const response = await secureApi.get<T>(url, {
    ...config,
    withCredentials: true,
  });
  return response.data;
}

/**
 * Fonction de fetch générique authentifiée pour tous les verbes HTTP
 * @param method Le verbe HTTP (GET, POST, PATCH, DELETE, etc.)
 * @param url L'URL relative de l'API (ex: /tournaments)
 * @param options Options de requête : { data, params, headers, ... }
 * @returns Les données de la réponse (response.data)
 * @throws L'erreur axios si la requête échoue
 *
 * Utilisation :
 * await authedFetch('POST', '/tournaments', { data: { ... } })
 */
export async function authedFetch<T = unknown>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  options: {
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    [key: string]: unknown;
  } = {},
): Promise<T> {
  const config = {
    method,
    url,
    ...options,
    withCredentials: true,
  };
  const response = await secureApi.request<T>(config);
  return response.data;
}
