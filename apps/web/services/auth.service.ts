import axios from "axios";
import { LoginRequest, RegisterRequest, User } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Intercepteur pour gérer automatiquement les erreurs 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

let refreshTimer: NodeJS.Timeout | null = null;

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

// Fonction pour programmer le refresh proactif
const scheduleRefresh = (tokenExpirationTime: number) => {
  clearRefreshTimer();

  const refreshTime = Math.max(
    tokenExpirationTime - Date.now() - 5 * 60 * 1000,
    2 * 60 * 1000,
  );

  refreshTimer = setTimeout(async () => {
    try {
      await api.post("/auth/refresh");

      scheduleRefresh(Date.now() + 12 * 60 * 1000);
    } catch (error) {
      console.error("Proactive refresh failed:", error);
      clearRefreshTimer();
    }
  }, refreshTime);
};

api.interceptors.response.use(
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
        // Si on est déjà en train de rafraîchir, on met la requête en queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        scheduleRefresh(Date.now() + 14 * 60 * 1000);
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const authService = {
  scheduleRefresh,

  async login(credentials: LoginRequest): Promise<{ user: User }> {
    const { rememberMe, ...loginPayload } = credentials;
    const response = await api.post<{ user: User }>(
      "/auth/login",
      loginPayload,
      {
        headers: {
          "x-remember-me": rememberMe ? "true" : "false",
        },
        withCredentials: true,
      },
    );

    scheduleRefresh(Date.now() + 14 * 60 * 1000);

    return response.data;
  },

  async register(
    userData: RegisterRequest,
    rememberMe = false,
  ): Promise<{ user: User }> {
    const response = await api.post<{ user: User }>(
      "/auth/register",
      userData,
      {
        headers: {
          "x-remember-me": rememberMe ? "true" : "false",
        },
      },
    );

    scheduleRefresh(Date.now() + 14 * 60 * 1000);

    return response.data;
  },

  async logout(): Promise<void> {
    clearRefreshTimer();
    await api.post("/auth/logout");
  },

  async getProfile(): Promise<User> {
    const response = await api.post<User>("/auth/profile");
    return response.data;
  },

  async refreshToken(rememberMe = false): Promise<void> {
    await api.post("/auth/refresh", null, {
      headers: {
        "x-remember-me": rememberMe ? "true" : "false",
      },
    });
  },
};

export default api;
