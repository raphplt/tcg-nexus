import { MailI18nService } from "./mail-i18n.service";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

describe("MailI18nService", () => {
  const service = new MailI18nService();

  const templates = Object.keys(fr).filter((key) => key !== "common");

  it("retombe sur le français pour une locale inconnue", () => {
    expect(service.resolveLocale("de")).toBe("fr");
    expect(service.resolveLocale(null)).toBe("fr");
    expect(service.resolveLocale("en")).toBe("en");
  });

  it("fusionne les libellés communs avec ceux du template", () => {
    const texts = service.texts("ticket-created", "fr");
    expect(texts.greeting).toBe("Bonjour,");
    expect(texts.subjectLabel).toBe("Sujet :");
  });

  it.each(templates)("le template %s existe dans les deux langues", (name) => {
    expect(Object.keys(fr[name])).toEqual(Object.keys(en[name]));
  });

  it.each(templates)("le template %s a un sujet traduit", (name) => {
    expect(service.texts(name, "fr").subject).toBeTruthy();
    expect(service.texts(name, "en").subject).toBeTruthy();
  });

  it("interpole les variables du sujet", () => {
    expect(
      service.subject("ticket-created", "fr", {
        ticketId: 12,
        subject: "Paiement",
      }),
    ).toBe("[TCG Nexus] Ticket #12 créé : Paiement");
    expect(
      service.subject("ticket-created", "en", {
        ticketId: 12,
        subject: "Payment",
      }),
    ).toBe("[TCG Nexus] Ticket #12 created: Payment");
  });

  it("laisse la variable en place si elle est absente", () => {
    expect(service.subject("tournament-started", "en", {})).toContain("{name}");
  });
});
