import { NotificationI18nService } from "./notification-i18n.service";
import { DEFAULT_LOCALE } from "src/translation/supported-locales";

describe("NotificationI18nService", () => {
  let service: NotificationI18nService;

  beforeEach(() => {
    service = new NotificationI18nService();
  });

  describe("resolveLocale", () => {
    it("should return the locale if it is supported", () => {
      expect(service.resolveLocale("en")).toBe("en");
      expect(service.resolveLocale("fr")).toBe("fr");
    });

    it("should fallback to DEFAULT_LOCALE for unsupported locales or empty inputs", () => {
      expect(service.resolveLocale("es")).toBe(DEFAULT_LOCALE);
      expect(service.resolveLocale("de")).toBe(DEFAULT_LOCALE);
      expect(service.resolveLocale(null)).toBe(DEFAULT_LOCALE);
      expect(service.resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
      expect(service.resolveLocale("")).toBe(DEFAULT_LOCALE);
    });
  });

  describe("render", () => {
    it("should render and interpolate an English notification", () => {
      const rendered = service.render("tournament.started", "en", {
        name: "Spring Championship",
      });

      expect(rendered.title).toBe("Tournament started");
      expect(rendered.body).toBe(
        'The "Spring Championship" tournament has started.',
      );
    });

    it("should render and interpolate a French notification", () => {
      const rendered = service.render("tournament.started", "fr", {
        name: "Tournoi de Printemps",
      });

      expect(rendered.title).toBe("Tournoi démarré");
      expect(rendered.body).toBe(
        'Le tournoi "Tournoi de Printemps" a démarré.',
      );
    });

    it("should leave placeholder intact when param is missing", () => {
      const rendered = service.render("tournament.started", "en", {});

      expect(rendered.title).toBe("Tournament started");
      expect(rendered.body).toBe('The "{name}" tournament has started.');
    });

    it("should return fallback object when key is not found in dictionary", () => {
      const rendered = service.render("unknown.notification.key", "en");

      expect(rendered).toEqual({
        title: "unknown.notification.key",
        body: "",
      });
    });

    it("should use DEFAULT_LOCALE when locale is undefined or unsupported", () => {
      const rendered = service.render("match.ready", undefined);

      expect(rendered.title).toBe("Match prêt");
      expect(rendered.body).toBe("Votre match peut commencer.");
    });
  });
});
