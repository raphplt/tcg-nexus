import { GameEngine } from "../GameEngine";
import { AnyEffect, EffectType, TargetType } from "./Effect";

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
    context?: {
      selectedTargetInstanceId?: string;
    },
  ) {
    for (const effect of effects) {
      this.resolveSingleEffect(effect, sourcePlayerId, events, context);
    }
  }

  private resolveSingleEffect(
    effect: AnyEffect,
    sourcePlayerId: string,
    events: any[],
    context?: {
      selectedTargetInstanceId?: string;
    },
  ) {
    const state = this.engine.getState();
    const opponentId = state.playerIds.find((id) => id !== sourcePlayerId)!;

    switch (effect.type) {
      case EffectType.DAMAGE:
        const targetMon = this.resolvePokemonTarget(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );

        if (targetMon) {
          targetMon.damageCounters += effect.amount;
          events.push({
            type: "DAMAGE_DEALT",
            amount: effect.amount,
            targetInstanceId: targetMon.instanceId,
          });
        }
        break;

      case EffectType.HEAL:
        const healTarget = this.resolvePokemonTarget(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );

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
        const isHeads = this.engine.nextRandom() >= 0.5;
        events.push({
          type: "COIN_FLIPPED",
          result: isHeads ? "HEADS" : "TAILS",
          playerId: sourcePlayerId,
        });

        if (isHeads && effect.onHeads) {
          this.resolveEffects(effect.onHeads, sourcePlayerId, events, context);
        } else if (!isHeads && effect.onTails) {
          this.resolveEffects(effect.onTails, sourcePlayerId, events, context);
        }
        break;

      case EffectType.APPLY_SPECIAL_CONDITION:
        const condTarget = this.resolvePokemonTarget(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );

        if (condTarget) {
          condTarget.specialConditions = this.engine.applySpecialCondition(
            condTarget.specialConditions,
            effect.condition as any,
          );
          events.push({
            type: "SPECIAL_CONDITION_APPLIED",
            condition: effect.condition,
            targetInstanceId: condTarget.instanceId,
          });
        }
        break;

      case EffectType.DISCARD_ENERGY:
        this.engine.discardAttachedEnergy(
          sourcePlayerId,
          effect.target,
          effect.amount,
          events,
        );
        break;

      case EffectType.DRAW_CARD:
        const player = state.players[sourcePlayerId];
        for (let i = 0; i < effect.amount; i++) {
          this.engine.drawCardForEffect(player.playerId, events);
        }
        break;

      case EffectType.DRAW_UNTIL_HAND_SIZE:
        while (state.players[sourcePlayerId].hand.length < effect.handSize) {
          const drawn = this.engine.drawCardForEffect(sourcePlayerId, events);
          if (!drawn) {
            break;
          }
        }
        break;

      default:
        console.warn(`Effect type not implemented yet.`);
    }
  }

  private resolvePokemonTarget(
    target: TargetType,
    sourcePlayerId: string,
    opponentId: string,
    selectedTargetInstanceId?: string,
  ) {
    const state = this.engine.getState();
    if (target === TargetType.OPPONENT_ACTIVE) {
      return state.players[opponentId].active;
    }

    if (target === TargetType.SELF || target === TargetType.PLAYER_ACTIVE) {
      return state.players[sourcePlayerId].active;
    }

    if (
      target === TargetType.SELECTED_OWN_POKEMON &&
      selectedTargetInstanceId
    ) {
      const player = state.players[sourcePlayerId];
      if (player.active?.instanceId === selectedTargetInstanceId) {
        return player.active;
      }

      return (
        player.bench.find(
          (pokemon) => pokemon.instanceId === selectedTargetInstanceId,
        ) || null
      );
    }

    return null;
  }
}
