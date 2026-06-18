import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, router } from "expo-router";
import { Pressable, type ColorValue } from "react-native";
import type { ComponentProps } from "react";
import { colors } from "@/constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  color,
  name,
  size,
}: {
  color: ColorValue;
  name: IconName;
  size: number;
}) {
  return <Ionicons color={color} name={name} size={size} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.heroDark,
        },
        headerTintColor: colors.heroDarkForeground,
        sceneStyle: {
          backgroundColor: colors.pageBg,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/profile")}
            style={{ marginRight: 16, padding: 4 }}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.heroDarkForeground} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="flash" size={size} />
          ),
          title: "Accueil",
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="albums" size={size} />
          ),
          title: "Collection",
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="trophy" size={size} />
          ),
          title: "Tournois",
        }}
      />
      <Tabs.Screen
        name="collection/[id]"
        options={{
          href: null,
          title: "Collection",
          headerRight: () => null,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.heroDarkForeground} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="pokedex"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="book-outline" size={size} />
          ),
          title: "Pokédex",
        }}
      />
      <Tabs.Screen
        name="decks/index"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="layers" size={size} />
          ),
          title: "Decks",
        }}
      />
      <Tabs.Screen
        name="decks/[id]"
        options={{
          href: null,
          title: "Détails du Deck",
          headerRight: () => null,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.heroDarkForeground} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="decks/create"
        options={{
          href: null,
          title: "Créer un Deck",
          headerRight: () => null,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.heroDarkForeground} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: "Mon Profil",
          headerRight: () => null,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.heroDarkForeground} />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
