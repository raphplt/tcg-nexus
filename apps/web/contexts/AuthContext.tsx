"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, LoginRequest, RegisterRequest } from "@/types/auth";
import { authService } from "@/services/auth.service";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = Cookies.get("accessToken");
        if (accessToken) {
          const userData = await authService.getProfile();
          setUser(userData);
        } else {
          // Pas d'accessToken, on tente un refresh si refreshToken présent
          const refreshToken = Cookies.get("refreshToken");
          if (refreshToken) {
            try {
              const tokens = await authService.refreshToken(refreshToken);
              // On stocke les nouveaux tokens (durée par défaut, ou on peut raffiner selon rememberMe si besoin)
              Cookies.set("accessToken", tokens.accessToken, {
                expires: 1 / 96,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
              });
              Cookies.set("refreshToken", tokens.refreshToken, {
                expires: 7,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
              });
              // On relance getProfile
              const userData = await authService.getProfile();
              setUser(userData);
            } catch (refreshError) {
              // Refresh échoué, on considère l'utilisateur déconnecté
              setUser(null);
              Cookies.remove("accessToken");
              Cookies.remove("refreshToken");
            }
          } else {
            setUser(null);
          }
        }
      } catch (error: any) {
        // Si erreur 401, on tente un refresh
        if (error?.response?.status === 401) {
          const refreshToken = Cookies.get("refreshToken");
          if (refreshToken) {
            try {
              const tokens = await authService.refreshToken(refreshToken);
              Cookies.set("accessToken", tokens.accessToken, {
                expires: 1 / 96,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
              });
              Cookies.set("refreshToken", tokens.refreshToken, {
                expires: 7,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
              });
              const userData = await authService.getProfile();
              setUser(userData);
            } catch (refreshError) {
              setUser(null);
              Cookies.remove("accessToken");
              Cookies.remove("refreshToken");
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);

      // Gestion de la durée des cookies selon le "se souvenir de moi"
      const rememberMe = credentials.rememberMe;
      Cookies.set("accessToken", response.tokens.accessToken, {
        expires: rememberMe ? 7 : 1 / 96, // 7 jours ou 15 min
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      Cookies.set("refreshToken", response.tokens.refreshToken, {
        expires: rememberMe ? 30 : 7, // 30 jours ou 7 jours
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      setUser(response.user);
      router.push("/");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true);
      const response = await authService.register(userData);

      Cookies.set("accessToken", response.tokens.accessToken, {
        expires: 1 / 96, // 15 minutes
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      Cookies.set("refreshToken", response.tokens.refreshToken, {
        expires: 7, // 7 jours
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      setUser(response.user);
      router.push("/");
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsLoading(true);
    authService.logout();
    setUser(null);
    setIsLoading(false);
    router.push("/auth/login");
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
