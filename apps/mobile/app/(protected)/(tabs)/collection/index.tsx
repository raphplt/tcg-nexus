import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DecksView } from "@/components/collection/DecksView";
import { PersonalCollectionView } from "@/components/collection/PersonalCollectionView";
import { PokedexView } from "@/components/collection/PokedexView";
import { colors, radius } from "@/constants/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];
type CollectionTab = "perso" | "pokedex" | "decks";

const TABS: { key: CollectionTab; label: string; icon: IconName }[] = [
  { key: "perso", label: "Collection", icon: "albums" },
  { key: "pokedex", label: "Pokédex", icon: "book-outline" },
  { key: "decks", label: "Decks", icon: "layers" },
];

export default function CollectionScreen() {
  const [activeTab, setActiveTab] = useState<CollectionTab>("perso");

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const focused = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.tabItem,
                focused && styles.tabItemActive,
                pressed && styles.tabItemPressed,
              ]}
            >
              <Ionicons
                color={focused ? colors.primary : colors.mutedForeground}
                name={tab.icon}
                size={16}
              />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === "perso" && <PersonalCollectionView />}
        {activeTab === "pokedex" && <PokedexView />}
        {activeTab === "decks" && <DecksView />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabItem: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderRadius: radius.full,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10,
  },
  tabItemActive: {
    backgroundColor: colors.accent,
  },
  tabItemPressed: {
    opacity: 0.75,
  },
  tabLabel: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
