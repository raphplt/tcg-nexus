import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthProvider";

export default function ProtectedLayout() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.heroDark },
        headerTintColor: colors.heroDarkForeground,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
