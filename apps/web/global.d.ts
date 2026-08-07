import type { routing } from "@/i18n/routing";

// typage de useLocale() et des helpers de navigation sur les locales supportées
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
  }
}
