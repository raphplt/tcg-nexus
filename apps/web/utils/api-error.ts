type ApiErrorPayload = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
};

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
