import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
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
        name="collection/[id]"
        options={{
          href: null,
          title: "Collection",
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
        name="marketplace"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="cart" size={size} />
          ),
          title: "Marketplace",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="person-circle" size={size} />
          ),
          title: "Profil",
        }}
      />
    </Tabs>
  );
}
