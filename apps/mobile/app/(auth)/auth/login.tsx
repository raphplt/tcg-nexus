import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/contexts/AuthProvider";

export default function LoginScreen() {
  const { isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async () => {
    await login({
      email: email.trim(),
      password,
      rememberMe,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>AUTH FLOW</Text>
          <Text style={styles.title}>Connexion securisee</Text>
          <Text style={styles.subtitle}>
            L&apos;app Expo utilise maintenant des JWT natifs, un refresh
            automatique et une navigation protegee par session.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Adresse email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="vous@tcgnexus.app"
            placeholderTextColor="#8b92a1"
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Votre mot de passe"
            placeholderTextColor="#8b92a1"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <View style={styles.rememberRow}>
            <View style={styles.rememberTextBlock}>
              <Text style={styles.rememberTitle}>Rester connecte</Text>
              <Text style={styles.rememberSubtitle}>
                Conserve aussi le refresh token pour restaurer la session.
              </Text>
            </View>
            <Switch
              onValueChange={setRememberMe}
              trackColor={{ false: "#d7dce5", true: "#d95f4d" }}
              value={rememberMe}
            />
          </View>

          <Pressable
            disabled={isLoading}
            onPress={() => {
              void handleLogin();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isLoading) && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? "Connexion..." : "Se connecter"}
            </Text>
          </Pressable>

          <Link href="/auth/register" style={styles.secondaryLink}>
            Creer un compte
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(21,35,59,0.08)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 22,
    shadowColor: "#15233b",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  eyebrow: {
    color: "#d95f4d",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  hero: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#f6f7fa",
    borderColor: "#e4e8ef",
    borderRadius: 16,
    borderWidth: 1,
    color: "#15233b",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    color: "#2b3340",
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#15233b",
    borderRadius: 18,
    marginTop: 8,
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
  rememberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginVertical: 6,
  },
  rememberSubtitle: {
    color: "#6a7382",
    fontSize: 13,
    lineHeight: 18,
  },
  rememberTextBlock: {
    flex: 1,
    gap: 4,
  },
  rememberTitle: {
    color: "#15233b",
    fontSize: 14,
    fontWeight: "700",
  },
  screen: {
    backgroundColor: "#f7f1e8",
    flex: 1,
  },
  secondaryLink: {
    color: "#d95f4d",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#5d6776",
    fontSize: 16,
    lineHeight: 23,
  },
  title: {
    color: "#15233b",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 10,
  },
});
