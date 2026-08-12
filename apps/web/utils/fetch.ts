import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import {
  DEFAULT_LOCALE,
  getLocaleFromPathname,
  isSupportedLocale,
  LOCALE_COOKIE_NAME,
} from "@/i18n/config";
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

function readCurrentLocale(): string {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const fromPath = getLocaleFromPathname(window.location.pathname);
  if (fromPath) {
    return fromPath;
  }

  const fromCookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.split("=")[1];

  return isSupportedLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
}

function withLocaleHeader(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    config.headers.set("Accept-Language", readCurrentLocale());
    return config;
  });
}

withLocaleHeader(api);
withLocaleHeader(secureApi);

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

const AUTH_ROUTES_SKIPPING_REFRESH = [
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/refresh",
];

let refreshPromise: Promise<void> | null = null;

/**
 * Starts a refresh request and shares its pending promise between concurrent callers. Clears it when the request settles so the next 401 can retry.
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
 * Generic authenticated TanStack Query fetcher.
 * @param url Relative API URL (for example, /tournaments).
 * @param config Config axios optionnelle (params, headers...)
 * @returns Response data (`response.data`).
 * @throws Axios error when the request fails.
 *
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
 * Generic authenticated fetch function for all HTTP methods.
 * @param method HTTP method (GET, POST, PATCH, DELETE, and so on).
 * @param url Relative API URL (for example, /tournaments).
 * @param options Request options: `{ data, params, headers, ... }`.
 * @returns Response data (`response.data`).
 * @throws Axios error when the request fails.
 *
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
