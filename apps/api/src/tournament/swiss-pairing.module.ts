import { Module } from "@nestjs/common";
import { SwissPairingService } from "./services/swiss-pairing.service";

/**
 * Exposes the Swiss pairing engine.
 *
 * Kept in its own module because it is consumed both by the tournament
 * orchestration and by the automatic progression triggered from matches;
 * having no dependency of its own, it introduces no module cycle.
 */
@Module({
  providers: [SwissPairingService],
  exports: [SwissPairingService],
})
export class SwissPairingModule {}
