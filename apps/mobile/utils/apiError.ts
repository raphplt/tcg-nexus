import axios from "axios";
import type { ApiErrorResponse } from "@/types";

const DEFAULT_ERROR_MESSAGE =
  "Une erreur est survenue. Merci de reessayer dans un instant.";
const NETWORK_ERROR_MESSAGE =
  "Impossible de joindre l'API. Verifiez EXPO_PUBLIC_API_URL et votre reseau.";

const normalizeMessage = (
  message: ApiErrorResponse["message"] | undefined,
): string | null => {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join("\n");
  }

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return null;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (
      error.code === "ERR_NETWORK" ||
      error.message.toLowerCase().includes("network")
    ) {
      return NETWORK_ERROR_MESSAGE;
    }

    const responseMessage = normalizeMessage(error.response?.data?.message);
    if (responseMessage) {
      return responseMessage;
    }

    if (typeof error.response?.data?.error === "string") {
      return error.response.data.error;
    }

    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

export const isUnauthorizedError = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 401;
