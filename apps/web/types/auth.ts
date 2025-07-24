export interface User {
  avatarUrl: string;
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "moderator" | "user";
  isPro: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}
