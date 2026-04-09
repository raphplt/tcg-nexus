export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Expiration absolue du access token, en millisecondes Unix. */
  accessTokenExpiresAt: number;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
  isPro?: boolean;
  isActive?: boolean;
  emailVerified?: boolean;
  preferredCurrency?: string;
  createdAt?: Date;
  updatedAt?: Date;
  player?: {
    id: number;
  } | null;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
