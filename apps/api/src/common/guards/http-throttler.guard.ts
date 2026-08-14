import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * ThrottlerGuard limité au contexte HTTP.
 *
 * Enregistré en APP_GUARD, le throttler s'appliquerait aussi aux gateways
 * WebSocket, où `switchToHttp()` ne rend pas une vraie requête : le quota des
 * sockets est géré par les gateways eux-mêmes.
 *
 * THROTTLE_DISABLED neutralise le quota pour les suites e2e, qui enchaînent
 * plus d'inscriptions que ce que la limite anti-bruteforce autorise.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      process.env.THROTTLE_DISABLED === "true" ||
      context.getType() !== "http"
    ) {
      return true;
    }
    return super.canActivate(context);
  }
}
