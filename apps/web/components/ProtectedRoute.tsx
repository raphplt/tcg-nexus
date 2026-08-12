"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/navigation";
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
      if (requireAuth && !isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};
