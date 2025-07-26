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
