import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "./supported-locales";

/**
 * Request locale, read from `Accept-Language` (sent by the web app).
 * Only the first recognized language is kept; otherwise the default locale.
 *
 * The header looks like `fr-FR,fr;q=0.9,en;q=0.8`: only the language prefix is
 * compared, the regional variant is irrelevant here.
 *
 * @param header Raw `Accept-Language` header value.
 * @returns Supported locale to serve.
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

/** `@RequestLocale() locale: SupportedLocale` in a controller signature. */
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
