import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Stack } from "expo-router";
import { Pressable } from "react-native";
import { useAuth } from "@/contexts/AuthProvider";

export default function TournamentsLayout() {
  const { user } = useAuth();
  const isAdminOrModerator = user?.role === "admin" || user?.role === "moderator";

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: "Tournois",
          headerStyle: {
            backgroundColor: "#15233b",
          },
          headerTintColor: "#fff8f3",
          headerTitleStyle: {
            fontWeight: "800",
          },
          headerRight: () =>
            isAdminOrModerator ? (
              <Link href="/tournaments/create" asChild>
                <Pressable hitSlop={10}>
                  <Ionicons name="add-circle" size={28} color="#d95f4d" />
                </Pressable>
              </Link>
            ) : null,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          title: "Nouveau tournoi",
          headerStyle: {
            backgroundColor: "#15233b",
          },
          headerTintColor: "#fff8f3",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: "Détails du tournoi",
          headerStyle: {
            backgroundColor: "#15233b",
          },
          headerTintColor: "#fff8f3",
        }}
      />
    </Stack>
  );
}
