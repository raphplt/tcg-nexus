import type {
  AuthSessionResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RefreshResponse,
  RegisterRequest,
  User,
} from "@/types";
import { api, type AppAxiosRequestConfig } from "./api";
import { secureApi } from "./secureApi";

interface RequestOptions {
  skipErrorToast?: boolean;
}

const normalizeAuthSession = (
  response: AuthSessionResponse,
): AuthSessionResponse => ({
  ...response,
  tokens: {
    ...response.tokens,
    accessTokenExpiresAt:
      response.tokens.accessTokenExpiresAt || response.accessTokenExpiresAt || 0,
  },
});

const normalizeRefreshResponse = (
  response: RefreshResponse,
): RefreshResponse => ({
  ...response,
  tokens: {
    ...response.tokens,
    accessTokenExpiresAt:
      response.tokens.accessTokenExpiresAt || response.accessTokenExpiresAt || 0,
  },
});

export const authService = {
  async login(
    credentials: LoginRequest,
    options?: RequestOptions,
  ): Promise<AuthSessionResponse> {
    const { rememberMe = false, ...payload } = credentials;
    const requestConfig: AppAxiosRequestConfig<Omit<LoginRequest, "rememberMe">> = {
      headers: {
        "x-remember-me": rememberMe ? "true" : "false",
      },
      skipErrorToast: options?.skipErrorToast,
    };

    const response = await api.post<AuthSessionResponse>(
      "/auth/login",
      payload,
      requestConfig,
    );

    return normalizeAuthSession(response.data as AuthSessionResponse);
  },

  async register(
    userData: RegisterRequest,
    options?: RequestOptions,
  ): Promise<AuthSessionResponse> {
    const { rememberMe = false, ...payload } = userData;
    const requestConfig: AppAxiosRequestConfig<
      Omit<RegisterRequest, "rememberMe">
    > = {
      headers: {
        "x-remember-me": rememberMe ? "true" : "false",
      },
      skipErrorToast: options?.skipErrorToast,
    };

    const response = await api.post<AuthSessionResponse>(
      "/auth/register",
      payload,
      requestConfig,
    );

    return normalizeAuthSession(response.data as AuthSessionResponse);
  },

  async logout(options?: RequestOptions): Promise<void> {
    const requestConfig: AppAxiosRequestConfig = {
      skipErrorToast: options?.skipErrorToast,
    };

    await secureApi.post(
      "/auth/logout",
      null,
      requestConfig,
    );
  },

  async refresh(
    refreshToken: string,
    rememberMe = false,
    options?: RequestOptions,
  ): Promise<RefreshResponse> {
    const requestConfig: AppAxiosRequestConfig<{ refreshToken: string }> = {
      headers: {
        "x-refresh-token": refreshToken,
        "x-remember-me": rememberMe ? "true" : "false",
      },
      skipErrorToast: options?.skipErrorToast,
    };

    const response = await api.post<RefreshResponse>(
      "/auth/refresh",
      { refreshToken },
      requestConfig,
    );

    return normalizeRefreshResponse(response.data as RefreshResponse);
  },

  async profile(options?: RequestOptions): Promise<User> {
    const requestConfig: AppAxiosRequestConfig = {
      skipErrorToast: options?.skipErrorToast,
    };

    const response = await secureApi.get<User>(
      "/auth/profile",
      requestConfig,
    );

    return response.data as User;
  },

  async getProfile(options?: RequestOptions): Promise<User> {
    return this.profile(options);
  },

  async requestPasswordReset(
    payload: ForgotPasswordRequest,
    options?: RequestOptions,
  ): Promise<void> {
    const requestConfig: AppAxiosRequestConfig<ForgotPasswordRequest> = {
      skipErrorToast: options?.skipErrorToast,
    };

    await api.post(
      "/auth/forgot-password",
      payload,
      requestConfig,
    );
  },
};
