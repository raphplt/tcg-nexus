import { create } from "zustand";
import {
  clearAuthStorage,
  saveAuthTokens,
  saveRememberMePreference,
  saveSessionExpiration,
} from "@/services/tokenStorage";
import type { AuthTokens, User } from "@/types";

interface LoginPayload {
  rememberMe?: boolean;
  tokens: AuthTokens;
  user: User;
}

interface SetTokensOptions {
  persist?: boolean;
  rememberMe?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isHydrated: boolean;
  rememberMe: boolean;
  tokens: AuthTokens | null;
  user: User | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setHydrated: (isHydrated: boolean) => void;
  setTokens: (
    tokens: AuthTokens | null,
    options?: SetTokensOptions,
  ) => Promise<void>;
  setUser: (user: User | null) => void;
}

const getAuthenticationState = (
  user: User | null,
  tokens: AuthTokens | null,
): boolean => Boolean(user && tokens?.accessToken);

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isHydrated: false,
  rememberMe: false,
  tokens: null,
  user: null,
  login: async ({ rememberMe = false, tokens, user }) => {
    await saveAuthTokens(tokens);
    await saveRememberMePreference(rememberMe);
    await saveSessionExpiration(rememberMe);

    set({
      isAuthenticated: true,
      rememberMe,
      tokens,
      user,
    });
  },
  logout: async () => {
    await clearAuthStorage();

    set({
      isAuthenticated: false,
      rememberMe: false,
      tokens: null,
      user: null,
    });
  },
  setHydrated: (isHydrated) => set({ isHydrated }),
  setTokens: async (tokens, options) => {
    if (!tokens) {
      await clearAuthStorage();
      set({
        isAuthenticated: false,
        rememberMe: false,
        tokens: null,
        user: null,
      });
      return;
    }

    const nextRememberMe =
      typeof options?.rememberMe === "boolean"
        ? options.rememberMe
        : get().rememberMe;

    if (options?.persist !== false) {
      await saveAuthTokens(tokens);
      await saveSessionExpiration(nextRememberMe);
    }

    if (typeof options?.rememberMe === "boolean") {
      await saveRememberMePreference(options.rememberMe);
    }

    const currentUser = get().user;

    set({
      isAuthenticated: getAuthenticationState(currentUser, tokens),
      rememberMe: nextRememberMe,
      tokens,
    });
  },
  setUser: (user) =>
    set((state) => ({
      isAuthenticated: getAuthenticationState(user, state.tokens),
      user,
    })),
}));
