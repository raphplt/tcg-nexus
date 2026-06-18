import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ApiErrorSnackbar } from "@/components/ApiErrorSnackbar";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AuthProvider } from "@/contexts/AuthProvider";
import { useAuthStore } from "@/store/useAuthStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe guard for repeated calls during fast refresh.
});

function AppNavigator() {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore splash screen race conditions.
      });
    }
  }, [isHydrated]);

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(protected)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
        <ApiErrorSnackbar />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
