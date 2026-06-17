import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthTokens } from "@/types";

const ACCESS_TOKEN_KEY = "tcg-nexus.access-token";
const REFRESH_TOKEN_KEY = "tcg-nexus.refresh-token";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "tcg-nexus.access-token-expires-at";
const REMEMBER_ME_KEY = "tcg-nexus.remember-me";
const SESSION_EXPIRES_AT_KEY = "tcg-nexus.session-expires-at";
const SECURE_STORE_OPTIONS = {
  keychainService: "tcg-nexus-auth",
};
const SHORT_SESSION_MS = 15 * 60 * 1000;
const LONG_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

const isWeb = Platform.OS === "web";

const setItem = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
};

const getItem = async (key: string): Promise<string | null> => {
  if (isWeb) {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
};

const deleteItem = async (key: string): Promise<void> => {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
};

export const saveAuthTokens = async (tokens: AuthTokens): Promise<void> => {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
    setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(tokens.accessTokenExpiresAt)),
  ]);
};

export const getStoredTokens = async (): Promise<AuthTokens | null> => {
  const [
    accessToken,
    refreshToken,
    rawAccessTokenExpiresAt,
    rawSessionExpiresAt,
  ] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
    getItem(ACCESS_TOKEN_EXPIRES_AT_KEY),
    getItem(SESSION_EXPIRES_AT_KEY),
  ]);

  if (!accessToken || !refreshToken || !rawAccessTokenExpiresAt) {
    return null;
  }

  const accessTokenExpiresAt = Number(rawAccessTokenExpiresAt);
  if (!Number.isFinite(accessTokenExpiresAt)) {
    return null;
  }

  if (rawSessionExpiresAt) {
    const sessionExpiresAt = Number(rawSessionExpiresAt);
    if (!Number.isFinite(sessionExpiresAt) || sessionExpiresAt <= Date.now()) {
      await Promise.all([
        deleteItem(ACCESS_TOKEN_KEY),
        deleteItem(REFRESH_TOKEN_KEY),
        deleteItem(ACCESS_TOKEN_EXPIRES_AT_KEY),
        deleteItem(REMEMBER_ME_KEY),
        deleteItem(SESSION_EXPIRES_AT_KEY),
      ]);
      return null;
    }
  }

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
  };
};

export const saveRememberMePreference = async (
  rememberMe: boolean,
): Promise<void> => {
  await setItem(REMEMBER_ME_KEY, rememberMe ? "true" : "false");
};

export const saveSessionExpiration = async (
  rememberMe: boolean,
): Promise<void> => {
  const ttl = rememberMe ? LONG_SESSION_MS : SHORT_SESSION_MS;
  await setItem(SESSION_EXPIRES_AT_KEY, String(Date.now() + ttl));
};

export const getRememberMePreference = async (): Promise<boolean> => {
  const value = await getItem(REMEMBER_ME_KEY);
  return value === "true";
};

export const clearAuthStorage = async (): Promise<void> => {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(ACCESS_TOKEN_EXPIRES_AT_KEY),
    deleteItem(REMEMBER_ME_KEY),
    deleteItem(SESSION_EXPIRES_AT_KEY),
  ]);
};
