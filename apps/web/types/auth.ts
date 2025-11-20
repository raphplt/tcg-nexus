import { Player } from "./tournament";

export interface User {
  avatarUrl: string;
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isPro: boolean;
  player?: Player;
  preferredCurrency?: string;
  createdAt: Date;
}

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  MODERATOR = "moderator",
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
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}
