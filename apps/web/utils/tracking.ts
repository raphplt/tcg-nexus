/**
 * Maps a carrier name and tracking number to an official parcel tracking URL.
 *
 * @param carrier - The carrier name declared by the seller (e.g., 'Colissimo', 'Mondial Relay').
 * @param trackingNumber - The parcel tracking number.
 * @returns The tracking URL if recognized, or null.
 */
export function getCarrierTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (!trackingNumber) return null;
  const cleanTracking = trackingNumber.trim();
  if (!cleanTracking) return null;

  const normalizedCarrier = (carrier ?? "").trim().toLowerCase();

  if (
    normalizedCarrier.includes("colissimo") ||
    normalizedCarrier.includes("poste") ||
    normalizedCarrier.includes("laposte")
  ) {
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(cleanTracking)}`;
  }

  if (
    normalizedCarrier.includes("chrono") ||
    normalizedCarrier.includes("chronopost")
  ) {
    return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(cleanTracking)}`;
  }

  if (
    normalizedCarrier.includes("mondial") ||
    normalizedCarrier.includes("relay") ||
    normalizedCarrier.includes("mondial relay")
  ) {
    return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(cleanTracking)}`;
  }

  if (normalizedCarrier.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(cleanTracking)}`;
  }

  if (normalizedCarrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(cleanTracking)}`;
  }

  if (normalizedCarrier.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(cleanTracking)}`;
  }

  if (normalizedCarrier.includes("gls")) {
    return `https://gls-group.eu/FR/fr/suivi-colis?match=${encodeURIComponent(cleanTracking)}`;
  }

  if (normalizedCarrier.includes("dpd")) {
    return `https://www.dpd.com/fr/fr/recevoir-des-colis/suivi-de-colis/?parcelNumber=${encodeURIComponent(cleanTracking)}`;
  }

  // Fallback for general carriers: if no carrier matched but tracking number exists, return null so it renders as text
  return null;
}
