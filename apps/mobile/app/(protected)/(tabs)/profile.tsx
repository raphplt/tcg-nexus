import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthProvider";
import { API_URL } from "@/services/api";

export default function ProfileScreen() {
  const { isLoading, logout, refreshUser, user } = useAuth();
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  const handleVerifyProfile = async () => {
    setIsCheckingProfile(true);

    try {
      const refreshedUser = await refreshUser();
      if (refreshedUser) {
        setLastCheckAt(new Date().toLocaleTimeString());
      }
    } finally {
      setIsCheckingProfile(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>PROFILE CHECK</Text>
        <Text style={styles.title}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
        <Text style={styles.role}>{String(user?.role ?? "user").toUpperCase()}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Connexion API</Text>
        <Text style={styles.infoValue}>GET {API_URL}/auth/profile</Text>
        <Text style={styles.infoMeta}>
          {lastCheckAt
            ? `Derniere verification reussie a ${lastCheckAt}.`
            : "Utilisez le bouton ci-dessous pour verifier la connexion en dev."}
        </Text>
      </View>

      <Pressable
        disabled={isCheckingProfile}
        onPress={() => {
          void handleVerifyProfile();
        }}
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || isCheckingProfile) && styles.primaryButtonPressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isCheckingProfile ? "Verification..." : "Verifier /auth/profile"}
        </Text>
      </Pressable>

      <Pressable
        disabled={isLoading}
        onPress={() => {
          void logout();
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          (pressed || isLoading) && styles.secondaryButtonPressed,
        ]}
      >
        <Text style={styles.secondaryButtonText}>
          {isLoading ? "Deconnexion..." : "Se deconnecter"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f7f1e8",
    flex: 1,
    gap: 16,
    padding: 20,
  },
  eyebrow: {
    color: "#f4ad9f",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroCard: {
    backgroundColor: "#15233b",
    borderRadius: 28,
    padding: 24,
  },
  infoCard: {
    backgroundColor: "#fffdf9",
    borderColor: "#eadfd3",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  infoLabel: {
    color: "#7c6a58",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  infoMeta: {
    color: "#6a7382",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  infoValue: {
    color: "#15233b",
    fontSize: 16,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#d95f4d",
    borderRadius: 18,
    paddingVertical: 16,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#fff8f3",
    fontSize: 16,
    fontWeight: "800",
  },
  role: {
    color: "#f4ad9f",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 14,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#fffdf9",
    borderColor: "#15233b",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    color: "#15233b",
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    color: "#e5e9f1",
    fontSize: 16,
  },
  title: {
    color: "#fff8f3",
    fontSize: 30,
    fontWeight: "800",
  },
});
