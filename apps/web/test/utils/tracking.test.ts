import { describe, expect, it } from "vitest";
import { getCarrierTrackingUrl } from "@/utils/tracking";

describe("getCarrierTrackingUrl", () => {
  it("returns null if tracking number is missing or empty", () => {
    expect(getCarrierTrackingUrl("Colissimo", null)).toBeNull();
    expect(getCarrierTrackingUrl("Colissimo", "")).toBeNull();
    expect(getCarrierTrackingUrl("Colissimo", "   ")).toBeNull();
  });

  it("resolves Colissimo / La Poste tracking url", () => {
    const url = getCarrierTrackingUrl("Colissimo", "6A123456789");
    expect(url).toBe(
      "https://www.laposte.fr/outils/suivre-vos-envois?code=6A123456789",
    );
  });

  it("resolves Chronopost tracking url", () => {
    const url = getCarrierTrackingUrl("Chronopost", "EE123456789FR");
    expect(url).toBe(
      "https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=EE123456789FR",
    );
  });

  it("resolves Mondial Relay tracking url", () => {
    const url = getCarrierTrackingUrl("Mondial Relay", "12345678");
    expect(url).toBe(
      "https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=12345678",
    );
  });

  it("resolves DHL tracking url", () => {
    const url = getCarrierTrackingUrl("DHL Express", "9876543210");
    expect(url).toBe(
      "https://www.dhl.com/en/express/tracking.html?AWB=9876543210",
    );
  });

  it("resolves UPS tracking url", () => {
    const url = getCarrierTrackingUrl("UPS", "1Z9999999999999999");
    expect(url).toBe("https://www.ups.com/track?tracknum=1Z9999999999999999");
  });

  it("returns null for unknown carrier", () => {
    expect(getCarrierTrackingUrl("UnknownCarrier", "12345")).toBeNull();
  });
});
