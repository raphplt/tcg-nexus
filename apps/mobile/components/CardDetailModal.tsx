import React from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getCardImage } from "@/utils/images";
import type { CardSearchResult } from "@/types";

interface CardDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  card: CardSearchResult | null;
}

const energyToImageName: Record<string, string> = {
  // French
  plante: "Type-Plante-JCC.png",
  feu: "Type-Feu-JCC.png",
  eau: "Type-Eau-JCC.png",
  électrique: "Type-Électrique-JCC.png",
  psy: "Type-Psy-JCC.png",
  incolore: "Type-Incolore-JCC.png",
  obscurité: "Type-Obscurité-JCC.png",
  métal: "Type-Métal-JCC.png",
  dragon: "Type-Dragon-JCC.png",
  fée: "Type-Fée-JCC.png",
  combat: "Type-Combat-JCC.png",

  // English
  grass: "Type-Plante-JCC.png",
  fire: "Type-Feu-JCC.png",
  water: "Type-Eau-JCC.png",
  lightning: "Type-Électrique-JCC.png",
  electric: "Type-Électrique-JCC.png",
  psychic: "Type-Psy-JCC.png",
  colorless: "Type-Incolore-JCC.png",
  darkness: "Type-Obscurité-JCC.png",
  dark: "Type-Obscurité-JCC.png",
  metal: "Type-Métal-JCC.png",
  fairy: "Type-Fée-JCC.png",
  fighting: "Type-Combat-JCC.png",
};

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  isVisible,
  onClose,
  card,
}) => {
  if (!card) return null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={isVisible}>
      <SafeAreaView style={styles.modalSafeArea}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.modalClose,
              pressed && styles.modalClosePressed,
            ]}
          >
            <Ionicons color="#0b0b0b" name="close" size={22} />
          </Pressable>

          <Image
            source={{ uri: getCardImage(card.image, "low") }}
            style={styles.modalImage}
          />

          <Text style={styles.modalTitle}>{card.name || "Carte"}</Text>
          <Text style={styles.modalMeta}>
            {card.set?.name || "Set inconnu"} •{" "}
            {card.rarity || "Rareté inconnue"}
          </Text>

          <Text style={styles.modalSectionTitle}>Informations</Text>
          <Text style={styles.modalText}>
            HP: {card.pokemonDetails?.hp || "-"}
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.modalText, { marginTop: 0 }]}>Types: </Text>
            {card.pokemonDetails?.types &&
            card.pokemonDetails.types.length > 0 ? (
              <View style={styles.typesContainer}>
                {card.pokemonDetails.types.map((type, i) => {
                  const key = type.toLowerCase().replace(/ /g, "_");
                  const imageName =
                    energyToImageName[key] ||
                    energyToImageName[type.toLowerCase()] ||
                    "Type-Incolore-JCC.png";
                  return (
                    <Image
                      key={i}
                      source={{
                        uri: `https://tcg-nexus.org/images/types/${imageName}`,
                      }}
                      style={styles.energyIcon}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.modalText, { marginTop: 0 }]}>-</Text>
            )}
          </View>

          <Text style={styles.modalText}>
            Stage: {card.pokemonDetails?.stage || "-"}
          </Text>
          <Text style={styles.modalText}>
            {card.pokemonDetails?.description ||
              "Aucune description disponible."}
          </Text>

          <Text style={styles.modalSectionTitle}>Attaques</Text>
          {(card.pokemonDetails?.attacks || []).length > 0 ? (
            card.pokemonDetails?.attacks?.map((attack, index) => (
              <View key={`attack-${index}`} style={styles.attackCard}>
                <View style={styles.attackHeader}>
                  <Text style={styles.attackName}>
                    {attack.name || "Attaque"}
                    {attack.damage ? ` - ${attack.damage}` : ""}
                  </Text>
                  {attack.cost && attack.cost.length > 0 && (
                    <View style={styles.attackCostContainer}>
                      {attack.cost.map((energy, i) => {
                        const key = energy.toLowerCase().replace(/ /g, "_");
                        const imageName =
                          energyToImageName[key] ||
                          energyToImageName[energy.toLowerCase()] ||
                          "Type-Incolore-JCC.png";
                        return (
                          <Image
                            key={i}
                            source={{
                              uri: `https://tcg-nexus.org/images/types/${imageName}`,
                            }}
                            style={styles.energyIcon}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
                <Text style={styles.attackText}>
                  {attack.effect || "Sans effet texte."}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.modalText}>
              Aucune attaque détaillée disponible.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  attackCard: {
    backgroundColor: "#f3f5f9",
    borderColor: "#e4e4e4",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  attackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  attackName: {
    color: "#0b0b0b",
    fontSize: 14,
    fontWeight: "800",
  },
  attackCostContainer: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
    backgroundColor: "#e4e4e4",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  energyIcon: {
    width: 16,
    height: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  typesContainer: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  attackText: {
    color: "#555555",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  modalClose: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#f3f5f9",
    borderRadius: 20,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  modalClosePressed: {
    opacity: 0.8,
  },
  modalContent: {
    backgroundColor: "#fcfcfc",
    padding: 16,
    paddingBottom: 34,
  },
  modalImage: {
    alignSelf: "center",
    borderRadius: 14,
    height: 320,
    marginTop: 12,
    resizeMode: "contain",
    width: "100%",
  },
  modalMeta: {
    color: "#555555",
    fontSize: 14,
    marginTop: 6,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#fcfcfc",
  },
  modalSectionTitle: {
    color: "#0b0b0b",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 14,
  },
  modalText: {
    color: "#555555",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  modalTitle: {
    color: "#0b0b0b",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 12,
  },
});
