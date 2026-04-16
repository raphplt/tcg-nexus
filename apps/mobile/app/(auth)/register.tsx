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
import { useAuth } from "@/contexts/AuthProvider";
import { mapAuthApiError } from "@/utils/authApiError";
import {
  type AuthFieldErrors,
  getPasswordStrengthLabel,
  validateRegisterForm,
} from "@/utils/authValidation";

export default function RegisterScreen() {
  const { isLoading, register } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<AuthFieldErrors>({});

  const passwordStrength = getPasswordStrengthLabel(password);

  const handleSubmit = async () => {
    const nextErrors = validateRegisterForm({
      pseudo: pseudo.trim(),
      email: email.trim(),
      password,
      confirmPassword,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      await register({
        confirmPassword,
        email: email.trim(),
        firstName: pseudo.trim(),
        lastName: pseudo.trim(),
        password,
        rememberMe,
      });
    } catch (error) {
      setErrors(mapAuthApiError(error, "register"));
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
          <Text style={styles.eyebrow}>ONBOARDING</Text>
          <Text style={styles.title}>Creer votre compte</Text>
          <Text style={styles.subtitle}>
            Le compte est cree via POST /auth/register et la session est activee
            ensuite via le flux JWT + refresh.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Pseudo</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => {
              setPseudo(value);
              setErrors((prev) => ({ ...prev, pseudo: undefined, form: undefined }));
            }}
            onFocus={() => {
              scrollRef.current?.scrollTo({ animated: true, y: 60 });
            }}
            placeholder="tcg_player"
            placeholderTextColor="#8b92a1"
            style={[styles.input, errors.pseudo ? styles.inputError : undefined]}
            value={pseudo}
          />
          {errors.pseudo ? <Text style={styles.errorText}>{errors.pseudo}</Text> : null}

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
              scrollRef.current?.scrollTo({ animated: true, y: 120 });
            }}
            placeholder="vous@tcgnexus.app"
            placeholderTextColor="#8b92a1"
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
              scrollRef.current?.scrollTo({ animated: true, y: 190 });
            }}
            placeholder="Choisissez un mot de passe"
            placeholderTextColor="#8b92a1"
            secureTextEntry
            style={[styles.input, errors.password ? styles.inputError : undefined]}
            value={password}
          />
          <Text style={styles.metaText}>Force: {passwordStrength}</Text>
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}

          <Text style={styles.label}>Confirmation</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => {
              setConfirmPassword(value);
              setErrors((prev) => ({
                ...prev,
                confirmPassword: undefined,
                form: undefined,
              }));
            }}
            onFocus={() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
            placeholder="Confirmez le mot de passe"
            placeholderTextColor="#8b92a1"
            secureTextEntry
            style={[styles.input, errors.confirmPassword ? styles.inputError : undefined]}
            value={confirmPassword}
          />
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}

          <View style={styles.rememberRow}>
            <View style={styles.rememberTextBlock}>
              <Text style={styles.rememberTitle}>Se souvenir de moi</Text>
              <Text style={styles.rememberSubtitle}>
                7 jours de persistance sinon session courte.
              </Text>
            </View>
            <Switch
              onValueChange={setRememberMe}
              trackColor={{ false: "#d7dce5", true: "#d95f4d" }}
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
              <ActivityIndicator color="#fff8f3" />
            ) : (
              <Text style={styles.primaryButtonText}>Creer mon compte</Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Link href="/login" style={styles.secondaryLink}>
              J'ai deja un compte
            </Link>
            <Link href="/forgot-password" style={styles.secondaryLink}>
              Mot de passe oublie
            </Link>
          </View>
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
    gap: 10,
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
  errorText: {
    color: "#b22525",
    fontSize: 13,
    fontWeight: "600",
    marginTop: -4,
  },
  formErrorText: {
    color: "#7a1f1f",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginVertical: 4,
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
  inputError: {
    borderColor: "#d95f4d",
  },
  label: {
    color: "#2b3340",
    fontSize: 14,
    fontWeight: "700",
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metaText: {
    color: "#6a7382",
    fontSize: 13,
    marginTop: -4,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#15233b",
    borderRadius: 18,
    marginTop: 8,
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 12,
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
    fontSize: 14,
    fontWeight: "700",
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
