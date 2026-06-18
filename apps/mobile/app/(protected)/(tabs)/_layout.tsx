import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

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
          backgroundColor: "#15233b",
        },
        headerTintColor: "#fff8f3",
        sceneStyle: {
          backgroundColor: "#f7f1e8",
        },
        tabBarActiveTintColor: "#d95f4d",
        tabBarInactiveTintColor: "#7a8090",
        tabBarStyle: {
          backgroundColor: "#fffdf9",
          borderTopColor: "#eadfd3",
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
