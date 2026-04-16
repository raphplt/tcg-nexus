export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  MODERATOR = "moderator",
}

export interface PlayerSummary {
  id: number;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  avatarUrl?: string | null;
  isPro?: boolean;
  isActive?: boolean;
  emailVerified?: boolean;
  preferredCurrency?: string | null;
  createdAt?: string;
  updatedAt?: string;
  player?: PlayerSummary | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
}

export interface AuthSessionResponse {
  user: User;
  tokens: AuthTokens;
  accessTokenExpiresAt?: number;
}

export interface RefreshResponse {
  success: boolean;
  tokens: AuthTokens;
  accessTokenExpiresAt?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  rememberMe?: boolean;
}
