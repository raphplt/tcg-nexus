import { Redirect, Slot } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthProvider";

export default function ProtectedLayout() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Slot />;
}
