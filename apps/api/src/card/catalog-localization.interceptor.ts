import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { resolveRequestLocale } from "src/translation/request-locale";
import { CatalogLocalizationService } from "./catalog-localization.service";

/**
 * Traduit les entités du catalogue de toutes les réponses de l'API dans la
 * langue de la requête. Voir `CatalogLocalizationService` pour le détail de la
 * résolution.
 */
@Injectable()
export class CatalogLocalizationInterceptor implements NestInterceptor {
  constructor(private readonly localization: CatalogLocalizationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      query?: Record<string, unknown>;
    }>();

    const header = request?.headers?.["accept-language"];
    const locale = resolveRequestLocale(
      Array.isArray(header) ? header[0] : (header as string | undefined),
    );

    // `?withTranslations=true`: Admin view. Since catalog data is public, this parameter exposes no confidential info;
    // it incurs only one additional DB query per entity type.
    const withTranslations = request?.query?.withTranslations === "true";

    return next
      .handle()
      .pipe(
        mergeMap((payload) =>
          this.localization.localize(payload, locale, { withTranslations }),
        ),
      );
  }
}
