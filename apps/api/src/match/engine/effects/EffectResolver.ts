import { GameEngine } from "../GameEngine";
import { GameState } from "../models/GameState";
import { AnyEffect, EffectType } from "./Effect";

export class EffectResolver {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  /**
   * Resolves a list of effects sequentially.
   */
  public resolveEffects(
    effects: AnyEffect[],
    sourcePlayerId: string,
    events: any[],
  ) {
    for (const effect of effects) {
      this.resolveSingleEffect(effect, sourcePlayerId, events);
    }
  }

  private resolveSingleEffect(
    effect: AnyEffect,
    sourcePlayerId: string,
    events: any[],
  ) {
    const state = this.engine.getState();
    const opponentId = state.playerIds.find((id) => id !== sourcePlayerId)!;

    switch (effect.type) {
      case EffectType.DAMAGE:
        // Identify target
        let targetMon: any = null;
        if (effect.target === "OPPONENT_ACTIVE") {
          targetMon = state.players[opponentId].active;
        } else if (
          effect.target === "SELF" ||
          effect.target === "PLAYER_ACTIVE"
        ) {
          targetMon = state.players[sourcePlayerId].active;
        }

        if (targetMon) {
          // Here we would apply weakness, resistance, tool modifiers, then apply damage
          targetMon.damageCounters += effect.amount;
          events.push({
            type: "DAMAGE_DEALT",
            amount: effect.amount,
            targetInstanceId: targetMon.instanceId,
          });
        }
        break;

      case EffectType.HEAL:
        // Handle healing Lady of the Pokemon Center: "Soignez 60 dégâts..."
        let healTarget: any = null;
        if (effect.target === "SELF" || effect.target === "PLAYER_ACTIVE") {
          healTarget = state.players[sourcePlayerId].active;
        }

        if (healTarget) {
          healTarget.damageCounters = Math.max(
            0,
            healTarget.damageCounters - effect.amount,
          );
          if (effect.removeSpecialConditions) {
            healTarget.specialConditions = [];
          }
          events.push({
            type: "HEALED",
            amount: effect.amount,
            targetInstanceId: healTarget.instanceId,
          });
        }
        break;

      case EffectType.COIN_FLIP:
        // Hardcoded math.random for now. In a real system, use a seeded RNG for replays
        const isHeads = Math.random() > 0.5;
        events.push({
          type: "COIN_FLIPPED",
          result: isHeads ? "HEADS" : "TAILS",
          playerId: sourcePlayerId,
        });

        if (isHeads && effect.onHeads) {
          this.resolveEffects(effect.onHeads, sourcePlayerId, events);
        } else if (!isHeads && effect.onTails) {
          this.resolveEffects(effect.onTails, sourcePlayerId, events);
        }
        break;

      case EffectType.APPLY_SPECIAL_CONDITION:
        // Apply to target
        let condTarget: any = null;
        if (effect.target === "OPPONENT_ACTIVE") {
          condTarget = state.players[opponentId].active;
        }

        if (condTarget) {
          // Add to array, removing conflicting ones if needed (like sleep replaces paralysis)
          // Simplified for now:
          condTarget.specialConditions.push(effect.condition as any);
          events.push({
            type: "SPECIAL_CONDITION_APPLIED",
            condition: effect.condition,
            targetInstanceId: condTarget.instanceId,
          });
        }
        break;

      case EffectType.DISCARD_ENERGY:
        // Discarding energy logic
        break;

      case EffectType.DRAW_CARD:
        const player = state.players[sourcePlayerId];
        for (let i = 0; i < effect.amount; i++) {
          if (player.deck.length > 0) {
            const card = player.deck.pop()!;
            player.hand.push(card);
            events.push({
              type: "CARD_DRAWN",
              playerId: sourcePlayerId,
              count: 1,
            });
          }
        }
        break;

      default:
        console.warn(`Effect type not implemented yet.`);
    }
  }
}
