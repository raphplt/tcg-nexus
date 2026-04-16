import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { authService } from "@/services/auth.service";
import { toast } from "@/store/useToastStore";
import { mapAuthApiError } from "@/utils/authApiError";
import {
  type AuthFieldErrors,
  validateForgotPasswordForm,
} from "@/utils/authValidation";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = validateForgotPasswordForm({ email: email.trim() });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await authService.requestPasswordReset(
        { email: email.trim() },
        { skipErrorToast: true },
      );
      toast.showSuccess("Si le compte existe, un email de reinitialisation a ete envoye.");
      router.replace("/login");
    } catch (error) {
      setErrors(mapAuthApiError(error, "forgot-password"));
    } finally {
      setIsSubmitting(false);
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
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>RESET PASSWORD</Text>
          <Text style={styles.title}>Mot de passe oublie</Text>
          <Text style={styles.subtitle}>
            Entrez votre email pour recevoir un lien de reinitialisation.
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
            placeholder="vous@tcgnexus.app"
            placeholderTextColor="#8b92a1"
            style={[styles.input, errors.email ? styles.inputError : undefined]}
            value={email}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          {errors.form ? <Text style={styles.formErrorText}>{errors.form}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSubmitting) && styles.primaryButtonPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff8f3" />
            ) : (
              <Text style={styles.primaryButtonText}>Envoyer le lien</Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Link href="/login" style={styles.secondaryLink}>
              Retour login
            </Link>
            <Link href="/register" style={styles.secondaryLink}>
              Creer un compte
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
