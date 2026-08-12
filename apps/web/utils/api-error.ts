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

/** Stable domain code returned by the API, independent of language. */
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
 * Translates an API error from its domain code. Falls back to the API message, then the default translation.
 */
export function translateApiError(
  error: unknown,
  t: Translator,
  fallbackMessage: string,
): string {
  const code = extractApiErrorCode(error);

  if (code) {
    const translated = t(code, extractApiErrorParams(error));

    if (translated && translated !== code && !translated.startsWith("⚠️")) {
      return translated;
    }
  }

  return extractApiErrorMessage(error, fallbackMessage);
}
