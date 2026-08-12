type ApiErrorPayload = {
  response?: {
    data?: {
      message?: string | string[];
      code?: string;
      params?: Record<string, string | number | Date>;
    };
  };
  message?: string;
};

/** Code métier stable renvoyé par l'API, indépendant de la langue. */
export function extractApiErrorCode(error: unknown): string | null {
  return (error as ApiErrorPayload | null)?.response?.data?.code ?? null;
}

export function extractApiErrorParams(
  error: unknown,
): Record<string, string | number | Date> {
  const params = (error as ApiErrorPayload | null)?.response?.data?.params;
  return (params ?? {}) as Record<string, string | number | Date>;
}

export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  const candidate = error as ApiErrorPayload | null;
  const payloadMessage =
    candidate?.response?.data?.message ?? candidate?.message ?? null;

  if (Array.isArray(payloadMessage)) {
    return payloadMessage.join(", ");
  }

  if (typeof payloadMessage === "string" && payloadMessage.trim().length > 0) {
    return payloadMessage;
  }

  return fallbackMessage;
}

type Translator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/**
 * Traduit une erreur API depuis son code métier.
 * Ordre de repli : traduction du code -> message renvoyé par l'API -> défaut.
 */
export function translateApiError(
  error: unknown,
  t: Translator,
  fallbackMessage: string,
): string {
  const code = extractApiErrorCode(error);

  if (code) {
    const translated = t(code, extractApiErrorParams(error));
    // next-intl renvoie la clé quand la traduction manque
    if (translated && translated !== code && !translated.startsWith("⚠️")) {
      return translated;
    }
  }

  return extractApiErrorMessage(error, fallbackMessage);
}
