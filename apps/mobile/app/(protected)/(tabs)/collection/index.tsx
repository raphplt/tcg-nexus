import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DecksView } from "@/components/collection/DecksView";
import { PersonalCollectionView } from "@/components/collection/PersonalCollectionView";
import { PokedexView } from "@/components/collection/PokedexView";
import { colors } from "@/constants/theme";

type CollectionTab = "perso" | "pokedex" | "decks";

const TABS: { key: CollectionTab; label: string }[] = [
  { key: "perso", label: "Collection" },
  { key: "pokedex", label: "Pokédex" },
  { key: "decks", label: "Decks" },
];

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<CollectionTab>("perso");

  return (
    <View style={styles.container}>
      <View style={[styles.tabBar, { paddingTop: insets.top + 6 }]}>
        {TABS.map((tab) => {
          const focused = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabItem}
            >
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              <View
                style={[
                  styles.tabUnderline,
                  focused && styles.tabUnderlineActive,
                ]}
              />
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
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
    paddingTop: 8,
  },
  tabLabel: {
    color: colors.mutedForeground,
    fontSize: 15,
    fontWeight: "700",
    paddingBottom: 10,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    backgroundColor: "transparent",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    height: 3,
    width: "60%",
  },
  tabUnderlineActive: {
    backgroundColor: colors.primary,
  },
});
