import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { tournamentService } from "@/services/tournament.service";
import { TournamentType } from "@/types";

export default function CreateTournamentScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    startDateStr: new Date().toISOString().split("T")[0] || "",
    endDateStr: new Date(Date.now() + 86400000).toISOString().split("T")[0] || "",
    type: TournamentType.SINGLE_ELIMINATION,
    isPublic: true,
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un nom pour le tournoi.");
      return;
    }
    
    // Validation basique des dates
    const startDate = new Date(formData.startDateStr);
    const endDate = new Date(formData.endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      Alert.alert("Erreur", "Format de date invalide. Utilisez AAAA-MM-JJ.");
      return;
    }

    try {
      setIsSubmitting(true);
      const dataToSubmit = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        type: formData.type,
        isPublic: formData.isPublic,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const newTournament = await tournamentService.createTournament(dataToSubmit);
      Alert.alert("Succès", "Le tournoi a été créé avec succès.");
      router.replace(`/tournaments/${newTournament.id}`);
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "Erreur",
        err?.response?.data?.message || "Impossible de créer le tournoi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Créer un tournoi</Text>
      <Text style={styles.subtitle}>
        Création rapide. Vous pourrez modifier les dates et les détails complets
        depuis la version Web.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nom du tournoi *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Tournoi d'été 2026"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Lieu</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Paris, Boutique XYZ..."
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
        />
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Début (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-06-25"
            value={formData.startDateStr}
            onChangeText={(text) => setFormData({ ...formData, startDateStr: text })}
          />
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Fin (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-06-26"
            value={formData.endDateStr}
            onChangeText={(text) => setFormData({ ...formData, endDateStr: text })}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Règles, lot à gagner..."
          multiline
          numberOfLines={4}
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Format du tournoi</Text>
        <View style={styles.typeSelector}>
          {(Object.values(TournamentType) as TournamentType[]).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.typeOption,
                formData.type === type && styles.typeOptionActive,
              ]}
              onPress={() => setFormData({ ...formData, type })}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  formData.type === type && styles.typeOptionTextActive,
                ]}
              >
                {type === TournamentType.SWISS_SYSTEM
                  ? "Ronde Suisse"
                  : type === TournamentType.SINGLE_ELIMINATION
                  ? "Élimination"
                  : type === TournamentType.DOUBLE_ELIMINATION
                  ? "Double Élim."
                  : "Round Robin"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.switchGroup}>
        <Text style={styles.label}>Tournoi public</Text>
        <Switch
          value={formData.isPublic}
          onValueChange={(val) => setFormData({ ...formData, isPublic: val })}
          trackColor={{ false: "#eadfd3", true: "#d95f4d" }}
        />
      </View>

      <Pressable
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleCreate}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff8f3" />
        ) : (
          <Text style={styles.submitButtonText}>Créer le tournoi</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f7f1e8",
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 12,
    borderWidth: 1,
    color: "#15233b",
    fontSize: 16,
    padding: 16,
  },
  label: {
    color: "#7c6a58",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#15233b",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    backgroundColor: "#15233b80",
  },
  submitButtonText: {
    color: "#fff8f3",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    marginBottom: 24,
  },
  switchGroup: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  title: {
    color: "#15233b",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  typeOption: {
    alignItems: "center",
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  typeOptionActive: {
    backgroundColor: "#15233b",
    borderColor: "#15233b",
  },
  typeOptionText: {
    color: "#7c6a58",
    fontSize: 12,
    fontWeight: "600",
  },
  typeOptionTextActive: {
    color: "#fff8f3",
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
