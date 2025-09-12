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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ne pas essayer de rafraîchir le token pour certaines routes
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
  }
);

export const authService = {
  async login(credentials: LoginRequest): Promise<{ user: User }> {
    // On retire rememberMe du body, on le passe juste dans le header
    const { rememberMe, ...loginPayload } = credentials;
    const response = await api.post<{ user: User }>(
      "/auth/login",
      loginPayload,
      {
        headers: {
          "x-remember-me": rememberMe ? "true" : "false",
        },
        withCredentials: true
      }
    );
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
    return response.data;
  },

  async logout(): Promise<void> {
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
