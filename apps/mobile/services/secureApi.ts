import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import type { RefreshResponse } from "@/types";
import { getRememberMePreference, getStoredTokens } from "./tokenStorage";
import {
  api,
  API_URL,
  type AppAxiosRequestConfig,
  type AppInternalAxiosRequestConfig,
  notifyApiError,
} from "./api";

const AUTH_ROUTES_SKIPPING_REFRESH = [
  "/auth/login",
  "/auth/logout",
  "/auth/refresh",
  "/auth/register",
];

const applyAuthorizationHeader = (
  request: AppInternalAxiosRequestConfig | AppAxiosRequestConfig,
  accessToken: string,
): void => {
  const nextValue = `Bearer ${accessToken}`;

  if (request.headers && typeof request.headers.set === "function") {
    request.headers.set("Authorization", nextValue);
    return;
  }

  request.headers = {
    ...(request.headers ?? {}),
    Authorization: nextValue,
  };
};

const resolveTokens = async () => {
  const storeTokens = useAuthStore.getState().tokens;
  if (storeTokens) {
    return storeTokens;
  }

  const storedTokens = await getStoredTokens();
  if (storedTokens) {
    await useAuthStore
      .getState()
      .setTokens(storedTokens, { persist: false, rememberMe: undefined });
  }

  return storedTokens;
};

const finalizeUnauthorizedState = async () => {
  await useAuthStore.getState().logout();
};

let refreshPromise: Promise<RefreshResponse> | null = null;

const refreshOnce = async (): Promise<RefreshResponse> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tokens = await resolveTokens();
      if (!tokens?.refreshToken) {
        throw new Error("Session expiree. Merci de vous reconnecter.");
      }

      const rememberMe = useAuthStore.getState().rememberMe
        ? true
        : await getRememberMePreference();

      const response = await api.post<RefreshResponse>(
        "/auth/refresh",
        {
          refreshToken: tokens.refreshToken,
        },
        {
          headers: {
            "x-refresh-token": tokens.refreshToken,
            "x-remember-me": rememberMe ? "true" : "false",
          },
          skipErrorToast: true,
        } as AppAxiosRequestConfig<{ refreshToken: string }>,
      );

      const refreshResponse = response.data as RefreshResponse;

      await useAuthStore.getState().setTokens(refreshResponse.tokens, {
        rememberMe,
      });

      return refreshResponse;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise as Promise<RefreshResponse>;
};

export const secureApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

secureApi.interceptors.request.use(
  async (request) => {
    const typedRequest = request as AppInternalAxiosRequestConfig;
    if (typedRequest.skipAuth) {
      return typedRequest;
    }

    const tokens = await resolveTokens();
    if (!tokens?.accessToken) {
      return typedRequest;
    }

    applyAuthorizationHeader(typedRequest, tokens.accessToken);
    return typedRequest;
  },
  async (error) => Promise.reject(error),
);

secureApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AppAxiosRequestConfig | undefined;

    if (!originalRequest) {
      notifyApiError(error);
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthRoute = AUTH_ROUTES_SKIPPING_REFRESH.some((route) =>
      requestUrl.includes(route),
    );

    if (error.response?.status === 401 && !isAuthRoute && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await refreshOnce();
        applyAuthorizationHeader(
          originalRequest,
          refreshResponse.tokens.accessToken,
        );
        return secureApi(originalRequest);
      } catch (refreshError) {
        await finalizeUnauthorizedState();
        notifyApiError(refreshError);
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && !isAuthRoute) {
      await finalizeUnauthorizedState();
    }

    notifyApiError(error);
    return Promise.reject(error);
  },
);
