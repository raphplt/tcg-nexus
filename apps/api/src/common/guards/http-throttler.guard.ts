import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * ThrottlerGuard restricted to the HTTP context.
 *
 * Registered as APP_GUARD, the throttler would also apply to WebSocket
 * gateways, where `switchToHttp()` does not return a real request: socket
 * quotas are handled by the gateways themselves.
 *
 * THROTTLE_DISABLED turns the quota off for the e2e suites, which chain more
 * sign-ups than the anti-bruteforce limit allows.
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
