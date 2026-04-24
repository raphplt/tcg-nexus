import { createHash } from "crypto";

// Hash une adresse IP pour anonymisation et conformité RGPD.
// Le hash est tronqué pour limiter le stockage de données sensibles.
export const hashIpAddress = (ipAddress?: string): string | undefined => {
  if (!ipAddress?.trim()) {
    return undefined;
  }

  return createHash("sha256")
    .update(ipAddress.trim())
    .digest("hex")
    .substring(0, 16);
};
