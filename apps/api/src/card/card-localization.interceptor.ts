import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { resolveRequestLocale } from "src/translation/request-locale";
import { CardLocalizationService } from "./card-localization.service";

/**
 * Traduit les cartes de toutes les réponses de l'API dans la langue de la
 * requête.
 *
 * Un intercepteur global plutôt qu'une résolution service par service : la
 * carte apparaît dans beaucoup de payloads — listings du marketplace, éléments
 * de collection, cartes de deck, résultats de recherche — et chacun aurait dû
 * penser à traduire. Ici, un seul point de passage les couvre tous, au prix
 * d'une requête par réponse contenant au moins une carte.
 */
@Injectable()
export class CardLocalizationInterceptor implements NestInterceptor {
  constructor(private readonly localization: CardLocalizationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const header = request?.headers?.["accept-language"];
    const locale = resolveRequestLocale(
      Array.isArray(header) ? header[0] : (header as string | undefined),
    );

    return next
      .handle()
      .pipe(mergeMap((payload) => this.localization.localize(payload, locale)));
  }
}
