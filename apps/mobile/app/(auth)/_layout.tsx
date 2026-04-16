import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthProvider";

export default function AuthLayout() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
