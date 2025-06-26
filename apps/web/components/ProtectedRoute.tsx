"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  allowedRoles?: ("admin" | "moderator" | "user")[];
  fallbackPath?: string;
}

export const ProtectedRoute = ({
  children,
  requireAuth = true,
  allowedRoles,
  fallbackPath = "/auth/login",
}: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Si l'authentification est requise mais l'utilisateur n'est pas connecté
      if (requireAuth && !isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      // Si des rôles spécifiques sont requis
      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    requireAuth,
    allowedRoles,
    router,
    fallbackPath,
  ]);

  // Afficher un loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si l'authentification est requise mais l'utilisateur n'est pas connecté
  if (requireAuth && !isAuthenticated) {
    return null; // Le redirect se fera via useEffect
  }

  // Si des rôles spécifiques sont requis et l'utilisateur n'a pas le bon rôle
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null; // Le redirect se fera via useEffect
  }

  return <>{children}</>;
};
