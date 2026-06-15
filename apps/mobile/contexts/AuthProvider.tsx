import { router } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import {
  getRememberMePreference,
  getStoredTokens,
} from "@/services/tokenStorage";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "@/store/useToastStore";
import type { LoginRequest, RegisterRequest, User } from "@/types";
import { isUnauthorizedError } from "@/utils/apiError";

interface AuthContextValue {
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  tokens: ReturnType<typeof useAuthStore.getState>["tokens"];
  user: User | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: (options?: { silent?: boolean }) => Promise<User | null>;
  register: (userData: RegisterRequest) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const {
    isAuthenticated,
    isHydrated,
    login: storeLogin,
    logout: storeLogout,
    setHydrated,
    setTokens,
    setUser,
    tokens,
    user,
  } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const [storedTokens, rememberMe] = await Promise.all([
          getStoredTokens(),
          getRememberMePreference(),
        ]);

        if (!storedTokens || !isMounted) {
          return;
        }

        await setTokens(storedTokens, {
          persist: false,
          rememberMe,
        });

        const profile = await authService.profile({ skipErrorToast: true });
        if (!isMounted) {
          return;
        }

        setUser(profile);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        await storeLogout();
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, [setHydrated, setTokens, setUser, storeLogout]);

  const refreshUser = async (options?: {
    silent?: boolean;
  }): Promise<User | null> => {
    try {
      const nextUser = await authService.profile({
        skipErrorToast: options?.silent,
      });
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await storeLogout();
      }
      return null;
    }
  };

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);

    try {
      const session = await authService.login(credentials);
      await storeLogin({
        rememberMe: credentials.rememberMe,
        tokens: session.tokens,
        user: session.user,
      });

      const profile = await authService.profile({ skipErrorToast: true });
      setUser(profile);
      toast.showSuccess("Session restauree. Bienvenue sur TCG Nexus.");
      router.replace("/");
    } catch (error) {
      await storeLogout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    setIsLoading(true);

    try {
      const session = await authService.register(userData);
      await storeLogin({
        rememberMe: userData.rememberMe,
        tokens: session.tokens,
        user: session.user,
      });

      const profile = await authService.profile({ skipErrorToast: true });
      setUser(profile);
      toast.showSuccess("Compte cree et session activee.");
      router.replace("/");
    } catch (error) {
      await storeLogout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);

    try {
      await authService.logout({ skipErrorToast: true });
    } catch {
      // The local session must always be cleared, even if the backend is unavailable.
    } finally {
      await storeLogout();
      setIsLoading(false);
      router.replace("/login");
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      isHydrated,
      isLoading,
      login,
      logout,
      refreshUser,
      register,
      tokens,
      user,
    }),
    [
      isAuthenticated,
      isHydrated,
      isLoading,
      tokens,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
