import axios from "axios";
import { getApiErrorMessage } from "@/utils/apiError";
import type { AuthFieldErrors } from "./authValidation";

type AuthMode = "login" | "register" | "forgot-password";

const includesOneOf = (value: string, candidates: string[]): boolean =>
  candidates.some((candidate) => value.includes(candidate));

export const mapAuthApiError = (
  error: unknown,
  mode: AuthMode,
): AuthFieldErrors => {
  if (!axios.isAxiosError(error)) {
    return {
      form: getApiErrorMessage(error),
    };
  }

  const status = error.response?.status;
  const rawMessage = String(
    error.response?.data?.message || error.message || "",
  );
  const message = rawMessage.toLowerCase();

  if (status === 429) {
    return {
      form: "Trop de tentatives. Patiente quelques minutes puis reessaie.",
    };
  }

  if (mode === "login") {
    if (status === 401) {
      return {
        password: "Identifiants invalides.",
      };
    }

    return {
      form: getApiErrorMessage(error),
    };
  }

  if (mode === "register") {
    if (
      status === 409 &&
      includesOneOf(message, ["email", "already", "exists"])
    ) {
      return {
        email: "Cet email est deja utilise.",
      };
    }

    if (
      status === 409 &&
      includesOneOf(message, ["pseudo", "username", "first name", "firstname"])
    ) {
      return {
        pseudo: "Ce pseudo est deja pris.",
      };
    }

    if (
      status === 400 &&
      includesOneOf(message, ["passwords do not match", "match"])
    ) {
      return {
        confirmPassword: "Les mots de passe ne correspondent pas.",
      };
    }

    return {
      form: getApiErrorMessage(error),
    };
  }

  if (status === 404) {
    return {
      form: "La reinitialisation mot de passe n'est pas encore disponible sur cette API.",
    };
  }

  return {
    form: getApiErrorMessage(error),
  };
};
