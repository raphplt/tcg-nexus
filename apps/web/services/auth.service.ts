import { LoginRequest, RegisterRequest, User } from "@/types/auth";
import { secureApi } from "@/utils/fetch";

export interface AuthSessionResponse {
  user: User;
  /** Expiration absolue du access token en ms Unix (source de vérité côté serveur). */
  accessTokenExpiresAt?: number;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthSessionResponse> {
    const { rememberMe, ...loginPayload } = credentials;
    const response = await secureApi.post<AuthSessionResponse>(
      "/auth/login",
      loginPayload,
      {
        headers: {
          "x-remember-me": rememberMe ? "true" : "false",
        },
      },
    );

    return response.data;
  },

  async register(
    userData: RegisterRequest,
    rememberMe = false,
  ): Promise<AuthSessionResponse> {
    const response = await secureApi.post<AuthSessionResponse>(
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
