import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Stack } from "expo-router";
import { Pressable } from "react-native";
import { colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthProvider";

export default function TournamentsLayout() {
  const { user } = useAuth();
  const isAdminOrModerator =
    user?.role === "admin" || user?.role === "moderator";

  const headerBase = {
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.foreground,
    headerTitleStyle: { fontWeight: "800" as const },
  };

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          ...headerBase,
          title: "Tournois",
          headerRight: () =>
            isAdminOrModerator ? (
              <Link href="/tournaments/create" asChild>
                <Pressable hitSlop={10}>
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </Pressable>
              </Link>
            ) : null,
        }}
      />
      <Stack.Screen
        name="create"
        options={{ ...headerBase, title: "Nouveau tournoi" }}
      />
      <Stack.Screen
        name="[id]"
        options={{ ...headerBase, title: "Détails du tournoi" }}
      />
    </Stack>
  );
}
