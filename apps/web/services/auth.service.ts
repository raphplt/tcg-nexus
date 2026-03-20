import { LoginRequest, RegisterRequest, User } from "@/types/auth";
import { clearRefreshTimer, scheduleRefresh, secureApi } from "@/utils/fetch";

export const authService = {
  scheduleRefresh,

  async login(credentials: LoginRequest): Promise<{ user: User }> {
    const { rememberMe, ...loginPayload } = credentials;
    const response = await secureApi.post<{ user: User }>(
      "/auth/login",
      loginPayload,
      {
        headers: {
          "x-remember-me": rememberMe ? "true" : "false",
        },
      },
    );

    scheduleRefresh(Date.now() + 14 * 60 * 1000);

    return response.data;
  },

  async register(
    userData: RegisterRequest,
    rememberMe = false,
  ): Promise<{ user: User }> {
    const response = await secureApi.post<{ user: User }>(
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
    await secureApi.post("/auth/logout");
  },

  async getProfile(): Promise<User> {
    const response = await secureApi.post<User>("/auth/profile");
    return response.data;
  },

  async refreshToken(rememberMe = false): Promise<void> {
    await secureApi.post("/auth/refresh", null, {
      headers: {
        "x-remember-me": rememberMe ? "true" : "false",
      },
    });
  },
};

export default secureApi;
