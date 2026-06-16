import { Link } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { colors, radius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthProvider";
import { mapAuthApiError } from "@/utils/authApiError";
import {
  type AuthFieldErrors,
  validateLoginForm,
} from "@/utils/authValidation";

export default function LoginScreen() {
  const { isLoading, login } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<AuthFieldErrors>({});

  const handleSubmit = async () => {
    const nextErrors = validateLoginForm({
      email: email.trim(),
      password,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      await login({
        email: email.trim(),
        password,
        rememberMe,
      });
    } catch (error) {
      setErrors(mapAuthApiError(error, "login"));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>TCG Nexus</Text>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>
            Accède à tes collections et scanne tes cartes.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Adresse email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
            }}
            onFocus={() => {
              scrollRef.current?.scrollTo({ animated: true, y: 80 });
            }}
            placeholder="vous@tcgnexus.app"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, errors.email ? styles.inputError : undefined]}
            value={email}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => {
              setPassword(value);
              setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
            }}
            onFocus={() => {
              scrollRef.current?.scrollTo({ animated: true, y: 160 });
            }}
            placeholder="Votre mot de passe"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            style={[styles.input, errors.password ? styles.inputError : undefined]}
            value={password}
          />
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          <View style={styles.rememberRow}>
            <View style={styles.rememberTextBlock}>
              <Text style={styles.rememberTitle}>Se souvenir de moi</Text>
              <Text style={styles.rememberSubtitle}>
                Reste connecté sur cet appareil.
              </Text>
            </View>
            <Switch
              onValueChange={setRememberMe}
              trackColor={{ false: colors.border, true: colors.primary }}
              value={rememberMe}
            />
          </View>

          {errors.form ? <Text style={styles.formErrorText}>{errors.form}</Text> : null}

          <Pressable
            disabled={isLoading}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isLoading) && styles.primaryButtonPressed,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Link href="/register" style={styles.secondaryLink}>
              Créer un compte
            </Link>
            <Link href="/forgot-password" style={styles.secondaryLink}>
              Mot de passe oublié
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 10,
    padding: 22,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -4,
  },
  formErrorText: {
    color: colors.destructive,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginVertical: 4,
  },
  hero: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  label: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    marginTop: 8,
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 12,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
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
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
  },
  rememberTextBlock: {
    flex: 1,
    gap: 4,
  },
  rememberTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
  screen: {
    backgroundColor: colors.pageBg,
    flex: 1,
  },
  secondaryLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: 16,
    lineHeight: 23,
  },
  title: {
    color: colors.foreground,
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 10,
  },
});
