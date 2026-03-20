import axios from "axios";
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

// --- Intercepteur de refresh token sur secureApi ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

export const scheduleRefresh = (tokenExpirationTime: number) => {
  clearRefreshTimer();

  const refreshTime = Math.max(
    tokenExpirationTime - Date.now() - 5 * 60 * 1000,
    2 * 60 * 1000,
  );

  refreshTimer = setTimeout(async () => {
    try {
      await secureApi.post("/auth/refresh");
      scheduleRefresh(Date.now() + 12 * 60 * 1000);
    } catch (error) {
      console.error("Proactive refresh failed:", error);
      clearRefreshTimer();
    }
  }, refreshTime);
};

export { clearRefreshTimer };

secureApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const skipRefreshRoutes = [
      "/auth/login",
      "/auth/register",
      "/auth/logout",
      "/auth/refresh",
    ];
    const shouldSkipRefresh = skipRefreshRoutes.some((route) =>
      originalRequest.url?.includes(route),
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return secureApi(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await secureApi.post("/auth/refresh");
        scheduleRefresh(Date.now() + 14 * 60 * 1000);
        processQueue(null);
        return secureApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
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
