import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "./supported-locales";

/**
 * Langue de la requête, lue dans `Accept-Language` (envoyé par le web).
 * On ne garde que la première langue reconnue ; à défaut, la langue par défaut.
 *
 * L'en-tête a la forme `fr-FR,fr;q=0.9,en;q=0.8` : on ne compare que le
 * préfixe de langue, la variante régionale ne nous concerne pas.
 */
export function resolveRequestLocale(header?: string): SupportedLocale {
  if (!header) return DEFAULT_LOCALE;

  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase();
    const language = tag?.split("-")[0];
    if (isSupportedLocale(language)) return language;
  }

  return DEFAULT_LOCALE;
}

/** `@RequestLocale() locale: SupportedLocale` dans une signature de contrôleur. */
export const RequestLocale = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SupportedLocale => {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = request.headers["accept-language"];

    return resolveRequestLocale(
      Array.isArray(header) ? header[0] : (header as string | undefined),
    );
  },
);
