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
