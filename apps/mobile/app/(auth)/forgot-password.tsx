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
import { colors, radius } from "@/constants/theme";
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
      toast.showSuccess("Si le compte existe, un email de réinitialisation a été envoyé.");
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
          <Text style={styles.brand}>TCG Nexus</Text>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            Entre ton email pour recevoir un lien de réinitialisation.
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
            placeholderTextColor={colors.mutedForeground}
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
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryButtonText}>Envoyer le lien</Text>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Link href="/login" style={styles.secondaryLink}>
              Retour connexion
            </Link>
            <Link href="/register" style={styles.secondaryLink}>
              Créer un compte
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
