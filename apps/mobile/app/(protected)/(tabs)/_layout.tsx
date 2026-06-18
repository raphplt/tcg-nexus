import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type GestureResponderEvent,
} from "react-native";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

// Bouton central proéminent pour l'onglet Scan
function ScanTabButton({
  onPress,
}: {
  onPress?: (event: GestureResponderEvent) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.scanWrapper}
    >
      <View style={styles.scanCircle}>
        <Ionicons color={colors.primaryForeground} name="scan" size={26} />
      </View>
      <Text style={styles.scanLabel}>Scan</Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: "800",
        },
        sceneStyle: {
          backgroundColor: colors.pageBg,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="flash" size={size} />
          ),
          title: "Accueil",
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="albums" size={size} />
          ),
          title: "Collection",
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          headerShown: false,
          title: "Scan",
          tabBarButton: (props) => <ScanTabButton onPress={props.onPress ?? undefined} />,
          tabBarStyle: { display: "none" },
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
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon color={color} name="person-circle-outline" size={size} />
          ),
          title: "Mon Profil",
        }}
      />

      <Tabs.Screen
        name="collection/[id]"
        options={{
          href: null,
          title: "Collection",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="decks/[id]"
        options={{
          href: null,
          title: "Détails du Deck",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="decks/create"
        options={{
          href: null,
          title: "Créer un Deck",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ marginLeft: 16, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanWrapper: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  scanCircle: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 30,
    borderWidth: 4,
    elevation: 6,
    height: 60,
    justifyContent: "center",
    marginTop: -26,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 60,
  },
  scanLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
