import { GameEngine } from "../GameEngine";
import { PokemonCardInGame } from "../models/Card";
import {
  AnyEffect,
  type AttachEnergyFromDeckEffect,
  type AttachEnergyFromDiscardEffect,
  type ConditionalEffect,
  CountSource,
  type DiscardFromHandEffect,
  type DynamicDamageEffect,
  EffectType,
  type FlipUntilTailsEffect,
  type MillEffect,
  type MoveEnergyEffect,
  type MultiCoinFlipEffect,
  type PlaceDamageCountersEffect,
  type SearchDeckEffect,
  type SearchDiscardEffect,
  type ShuffleHandDrawEffect,
  TargetType,
} from "./Effect";

export interface EffectContext {
  selectedTargetInstanceId?: string;
  currentAttackName?: string;
}

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
    context?: EffectContext,
  ) {
    for (const effect of effects) {
      this.resolveSingleEffect(effect, sourcePlayerId, events, context);
    }
  }

  private resolveSingleEffect(
    effect: AnyEffect,
    sourcePlayerId: string,
    events: any[],
    context?: EffectContext,
  ) {
    const state = this.engine.getState();
    const opponentId = state.playerIds.find((id) => id !== sourcePlayerId)!;

    switch (effect.type) {
      // ── Damage ──────────────────────────────────────────
      case EffectType.DAMAGE: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const targetMon of targets) {
          targetMon.damageCounters += effect.amount;
          events.push({
            type: "DAMAGE_DEALT",
            amount: effect.amount,
            targetInstanceId: targetMon.instanceId,
          });
        }
        break;
      }

      case EffectType.DYNAMIC_DAMAGE: {
        // Dynamic damage is computed at resolution time based on
        // game state counts. The base damage is handled by the
        // engine; this effect adds/subtracts the dynamic portion.
        const dynAmount = this.engine.computeDynamicDamage(
          effect,
          sourcePlayerId,
          opponentId,
        );
        if (dynAmount > 0) {
          const targets = this.resolveAllPokemonTargets(
            effect.target,
            sourcePlayerId,
            opponentId,
            context?.selectedTargetInstanceId,
          );
          for (const t of targets) {
            t.damageCounters += dynAmount;
            events.push({
              type: "DYNAMIC_DAMAGE_DEALT",
              amount: dynAmount,
              targetInstanceId: t.instanceId,
              countSource: effect.countSource,
            });
          }
        }
        break;
      }

      case EffectType.PLACE_DAMAGE_COUNTERS: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const targetMon of targets) {
          targetMon.damageCounters += effect.amount;
          events.push({
            type: "DAMAGE_COUNTERS_PLACED",
            amount: effect.amount,
            targetInstanceId: targetMon.instanceId,
          });
        }
        break;
      }

      // ── Healing ─────────────────────────────────────────
      case EffectType.HEAL: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const healTarget of targets) {
          const healAmount =
            effect.amount === "ALL" ? healTarget.damageCounters : effect.amount;
          healTarget.damageCounters = Math.max(
            0,
            healTarget.damageCounters - healAmount,
          );
          if (effect.removeSpecialConditions) {
            healTarget.specialConditions = [];
          }
          events.push({
            type: "HEALED",
            amount: healAmount,
            targetInstanceId: healTarget.instanceId,
          });
        }
        break;
      }

      // ── Special Conditions ──────────────────────────────
      case EffectType.APPLY_SPECIAL_CONDITION: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const condTarget of targets) {
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
      }

      case EffectType.REMOVE_SPECIAL_CONDITION: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const target of targets) {
          if (effect.condition) {
            target.specialConditions = target.specialConditions.filter(
              (c) => c !== effect.condition,
            );
          } else {
            target.specialConditions = [];
          }
          events.push({
            type: "SPECIAL_CONDITION_REMOVED",
            condition: effect.condition ?? "ALL",
            targetInstanceId: target.instanceId,
          });
        }
        break;
      }

      // ── Draw / Search ───────────────────────────────────
      case EffectType.DRAW_CARD: {
        for (let i = 0; i < effect.amount; i++) {
          this.engine.drawCardForEffect(sourcePlayerId, events);
        }
        break;
      }

      case EffectType.DRAW_UNTIL_HAND_SIZE: {
        while (state.players[sourcePlayerId].hand.length < effect.handSize) {
          const drawn = this.engine.drawCardForEffect(sourcePlayerId, events);
          if (!drawn) break;
        }
        break;
      }

      case EffectType.SEARCH_DECK: {
        // Requires a prompt to choose which card(s) to take.
        // The GameEngine will handle this via a pending prompt
        // flow (ChooseCardFromDeck).
        this.engine.initiateSearchDeck(
          sourcePlayerId,
          effect as SearchDeckEffect,
          events,
        );
        break;
      }

      case EffectType.LOOK_AT_TOP_DECK: {
        this.engine.initiateLookAtTopDeck(
          sourcePlayerId,
          effect.amount,
          events,
        );
        break;
      }

      case EffectType.SEARCH_DISCARD: {
        this.engine.initiateSearchDiscard(
          sourcePlayerId,
          effect as SearchDiscardEffect,
          events,
        );
        break;
      }

      // ── Hand Disruption ─────────────────────────────────
      case EffectType.DISCARD_FROM_HAND: {
        const discardEffect = effect as DiscardFromHandEffect;
        const targetPlayerId =
          discardEffect.target === "OPPONENT" ? opponentId : sourcePlayerId;
        this.engine.initiateDiscardFromHand(
          targetPlayerId,
          discardEffect,
          events,
        );
        break;
      }

      case EffectType.SHUFFLE_HAND_DRAW: {
        const shuffleEffect = effect as ShuffleHandDrawEffect;
        const targetPlayerIds =
          shuffleEffect.target === "BOTH"
            ? [sourcePlayerId, opponentId]
            : shuffleEffect.target === "OPPONENT"
              ? [opponentId]
              : [sourcePlayerId];

        for (const pid of targetPlayerIds) {
          const player = state.players[pid];
          // Shuffle hand into deck
          player.deck.push(...player.hand);
          player.hand = [];
          this.engine.shuffleDeck(pid);
          // Draw new hand
          for (let i = 0; i < shuffleEffect.drawAmount; i++) {
            this.engine.drawCardForEffect(pid, events);
          }
          events.push({
            type: "HAND_SHUFFLED_AND_DREW",
            playerId: pid,
            drawAmount: shuffleEffect.drawAmount,
          });
        }
        break;
      }

      case EffectType.MILL: {
        const millEffect = effect as MillEffect;
        const millPlayerId =
          millEffect.target === "OPPONENT" ? opponentId : sourcePlayerId;
        const millPlayer = state.players[millPlayerId];
        const milled = millPlayer.deck.splice(
          -millEffect.amount,
          millEffect.amount,
        );
        millPlayer.discard.push(...milled);
        events.push({
          type: "CARDS_MILLED",
          playerId: millPlayerId,
          count: milled.length,
        });
        break;
      }

      // ── Energy ──────────────────────────────────────────
      case EffectType.DISCARD_ENERGY: {
        this.engine.discardAttachedEnergy(
          sourcePlayerId,
          effect.target,
          effect.amount,
          events,
          effect.energyType,
        );
        break;
      }

      case EffectType.MOVE_ENERGY: {
        this.engine.initiateMoveEnergy(
          sourcePlayerId,
          effect as MoveEnergyEffect,
          events,
        );
        break;
      }

      case EffectType.ATTACH_ENERGY_FROM_DECK: {
        this.engine.initiateAttachEnergyFromDeck(
          sourcePlayerId,
          effect as AttachEnergyFromDeckEffect,
          events,
        );
        break;
      }

      case EffectType.ATTACH_ENERGY_FROM_DISCARD: {
        this.engine.initiateAttachEnergyFromDiscard(
          sourcePlayerId,
          effect as AttachEnergyFromDiscardEffect,
          events,
        );
        break;
      }

      // ── Board Manipulation ──────────────────────────────
      case EffectType.SWITCH_OPPONENT_ACTIVE: {
        this.engine.initiateSwitchOpponentActive(sourcePlayerId, events);
        break;
      }

      case EffectType.SWITCH_OWN_ACTIVE: {
        this.engine.initiateSwitchOwnActive(sourcePlayerId, events);
        break;
      }

      case EffectType.RETURN_TO_HAND: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const target of targets) {
          this.engine.returnPokemonToHand(target, events);
        }
        break;
      }

      case EffectType.SHUFFLE_INTO_DECK: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const target of targets) {
          this.engine.shufflePokemonIntoDeck(target, events);
        }
        break;
      }

      case EffectType.SHUFFLE_DECK: {
        this.engine.shuffleDeck(sourcePlayerId);
        events.push({
          type: "DECK_SHUFFLED",
          playerId: sourcePlayerId,
        });
        break;
      }

      case EffectType.DEVOLVE: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const target of targets) {
          this.engine.devolvePokemon(target, events);
        }
        break;
      }

      case EffectType.REVIVE: {
        this.engine.initiateRevive(sourcePlayerId, effect, events);
        break;
      }

      // ── Protection / Defense ────────────────────────────
      case EffectType.PREVENT_DAMAGE: {
        const target = this.resolveSinglePokemonTarget(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        if (target) {
          this.engine.applyTemporaryEffect(
            target.instanceId,
            {
              type: "PREVENT_DAMAGE",
              duration: effect.duration,
            },
            events,
          );
        }
        break;
      }

      case EffectType.REDUCE_DAMAGE: {
        const target = this.resolveSinglePokemonTarget(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        if (target) {
          this.engine.applyTemporaryEffect(
            target.instanceId,
            {
              type: "REDUCE_DAMAGE",
              amount: effect.amount,
              duration: effect.duration,
            },
            events,
          );
        }
        break;
      }

      // ── Restrictions / Locks ────────────────────────────
      case EffectType.CANT_ATTACK_NEXT_TURN: {
        const target = this.resolveSinglePokemonTarget(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        if (target) {
          this.engine.applyTemporaryEffect(
            target.instanceId,
            { type: "CANT_ATTACK" },
            events,
          );
        }
        break;
      }

      case EffectType.CANT_USE_SAME_ATTACK: {
        const self = state.players[sourcePlayerId].active;
        if (self) {
          this.engine.applyTemporaryEffect(
            self.instanceId,
            {
              type: "CANT_USE_SAME_ATTACK",
              attackName: context?.currentAttackName,
            },
            events,
          );
        }
        break;
      }

      case EffectType.OPPONENT_CANT_RETREAT: {
        const oppActive = state.players[opponentId].active;
        if (oppActive) {
          this.engine.applyTemporaryEffect(
            oppActive.instanceId,
            { type: "CANT_RETREAT" },
            events,
          );
        }
        break;
      }

      case EffectType.TRAINER_LOCK: {
        this.engine.applyPlayerEffect(
          opponentId,
          {
            type: "TRAINER_LOCK",
            lockType: effect.lockType,
            duration: effect.duration,
          },
          events,
        );
        break;
      }

      case EffectType.ABILITY_LOCK: {
        this.engine.applyGlobalEffect(
          { type: "ABILITY_LOCK", duration: effect.duration },
          events,
        );
        break;
      }

      // ── Damage Boost ────────────────────────────────────
      case EffectType.BOOST_NEXT_TURN_DAMAGE: {
        const self = state.players[sourcePlayerId].active;
        if (self) {
          this.engine.applyTemporaryEffect(
            self.instanceId,
            {
              type: "BOOST_DAMAGE",
              amount: effect.amount,
            },
            events,
          );
        }
        break;
      }

      // ── Coin Flip ───────────────────────────────────────
      case EffectType.COIN_FLIP: {
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
      }

      case EffectType.MULTI_COIN_FLIP: {
        const multiEffect = effect as MultiCoinFlipEffect;
        let headsCount = 0;
        for (let i = 0; i < multiEffect.count; i++) {
          const heads = this.engine.nextRandom() >= 0.5;
          events.push({
            type: "COIN_FLIPPED",
            result: heads ? "HEADS" : "TAILS",
            playerId: sourcePlayerId,
            flipIndex: i,
          });
          if (heads) headsCount++;
        }
        if (headsCount > 0 && multiEffect.perHeads) {
          for (let i = 0; i < headsCount; i++) {
            this.resolveEffects(
              multiEffect.perHeads,
              sourcePlayerId,
              events,
              context,
            );
          }
        }
        break;
      }

      case EffectType.FLIP_UNTIL_TAILS: {
        const flipEffect = effect as FlipUntilTailsEffect;
        let flipHeads = 0;
        let flipping = true;
        while (flipping) {
          const heads = this.engine.nextRandom() >= 0.5;
          events.push({
            type: "COIN_FLIPPED",
            result: heads ? "HEADS" : "TAILS",
            playerId: sourcePlayerId,
          });
          if (heads) {
            flipHeads++;
          } else {
            flipping = false;
          }
        }
        if (flipHeads > 0 && flipEffect.perHeads) {
          for (let i = 0; i < flipHeads; i++) {
            this.resolveEffects(
              flipEffect.perHeads,
              sourcePlayerId,
              events,
              context,
            );
          }
        }
        break;
      }

      // ── Copy / Transform ────────────────────────────────
      case EffectType.COPY_ATTACK: {
        this.engine.initiateCopyAttack(sourcePlayerId, effect, events);
        break;
      }

      // ── Lost Zone ───────────────────────────────────────
      case EffectType.SEND_TO_LOST_ZONE: {
        const targets = this.resolveAllPokemonTargets(
          effect.target,
          sourcePlayerId,
          opponentId,
          context?.selectedTargetInstanceId,
        );
        for (const target of targets) {
          this.engine.sendToLostZone(target, events);
        }
        break;
      }

      // ── Prizes ──────────────────────────────────────────
      case EffectType.EXTRA_PRIZE: {
        this.engine.markExtraPrize(sourcePlayerId, effect.amount);
        events.push({
          type: "EXTRA_PRIZE_MARKED",
          playerId: sourcePlayerId,
          amount: effect.amount,
        });
        break;
      }

      // ── Conditional ────────────────────────────────────────
      case EffectType.CONDITIONAL: {
        const condEffect = effect as ConditionalEffect;
        const condMet = this.evaluateCondition(
          condEffect.condition,
          sourcePlayerId,
          opponentId,
        );
        if (condMet) {
          this.resolveEffects(
            condEffect.thenEffects,
            sourcePlayerId,
            events,
            context,
          );
        } else if (condEffect.elseEffects) {
          this.resolveEffects(
            condEffect.elseEffects,
            sourcePlayerId,
            events,
            context,
          );
        }
        break;
      }

      default:
        console.warn(`Effect type not implemented: ${(effect as any).type}`);
    }
  }

  private evaluateCondition(
    condition: ConditionalEffect["condition"],
    sourcePlayerId: string,
    opponentId: string,
  ): boolean {
    const state = this.engine.getState();
    const source = state.players[sourcePlayerId];
    const opponent = state.players[opponentId];

    switch (condition.type) {
      case "IF_COIN_HEADS":
        return this.engine.nextRandom() >= 0.5;
      case "IF_COIN_TAILS":
        return this.engine.nextRandom() < 0.5;
      case "IF_MORE_PRIZES":
        return condition.than === "OPPONENT"
          ? source.prizeCardsTaken > opponent.prizeCardsTaken
          : opponent.prizeCardsTaken > source.prizeCardsTaken;
      case "IF_LESS_HP":
        return (
          (source.active?.damageCounters ?? 0) >=
          (source.active?.baseCard.hp ?? 0) - (condition.threshold ?? 0)
        );
      case "IF_KNOCKED_OUT":
        return (
          (source.active?.damageCounters ?? 0) >=
          (source.active?.baseCard.hp ?? 0)
        );
      case "IF_OPPONENT_POISONED":
        return (
          opponent.active?.specialConditions.includes("Poisoned" as any) ??
          false
        );
      case "IF_OPPONENT_HAS_SPECIAL_CONDITION":
        return (opponent.active?.specialConditions.length ?? 0) > 0;
      default:
        return false;
    }
  }

  // ─── Target Resolution ──────────────────────────────────

  /**
   * Returns a single Pokemon target (first match).
   * Used for effects that target one specific Pokemon.
   */
  private resolveSinglePokemonTarget(
    target: TargetType,
    sourcePlayerId: string,
    opponentId: string,
    selectedTargetInstanceId?: string,
  ): PokemonCardInGame | null {
    const targets = this.resolveAllPokemonTargets(
      target,
      sourcePlayerId,
      opponentId,
      selectedTargetInstanceId,
    );
    return targets[0] ?? null;
  }

  /**
   * Returns all Pokemon matching the target type.
   * Supports bulk targets like ALL_OPPONENT_BENCH.
   */
  private resolveAllPokemonTargets(
    target: TargetType,
    sourcePlayerId: string,
    opponentId: string,
    selectedTargetInstanceId?: string,
  ): PokemonCardInGame[] {
    const state = this.engine.getState();
    const source = state.players[sourcePlayerId];
    const opponent = state.players[opponentId];

    switch (target) {
      case TargetType.SELF:
      case TargetType.PLAYER_ACTIVE:
        return source.active ? [source.active] : [];

      case TargetType.OPPONENT_ACTIVE:
        return opponent.active ? [opponent.active] : [];

      case TargetType.PLAYER_BENCH:
        if (selectedTargetInstanceId) {
          const found = source.bench.find(
            (p) => p.instanceId === selectedTargetInstanceId,
          );
          return found ? [found] : [];
        }
        return [];

      case TargetType.OPPONENT_BENCH:
        if (selectedTargetInstanceId) {
          const found = opponent.bench.find(
            (p) => p.instanceId === selectedTargetInstanceId,
          );
          return found ? [found] : [];
        }
        return [];

      case TargetType.ALL_PLAYER_BENCH:
        return [...source.bench];

      case TargetType.ALL_OPPONENT_BENCH:
        return [...opponent.bench];

      case TargetType.ALL_PLAYER_POKEMON:
        return [...(source.active ? [source.active] : []), ...source.bench];

      case TargetType.ALL_OPPONENT_POKEMON:
        return [
          ...(opponent.active ? [opponent.active] : []),
          ...opponent.bench,
        ];

      case TargetType.ALL_POKEMON:
        return [
          ...(source.active ? [source.active] : []),
          ...source.bench,
          ...(opponent.active ? [opponent.active] : []),
          ...opponent.bench,
        ];

      case TargetType.SELECTED_OWN_POKEMON:
        if (selectedTargetInstanceId) {
          if (source.active?.instanceId === selectedTargetInstanceId) {
            return [source.active];
          }
          const benchMon = source.bench.find(
            (p) => p.instanceId === selectedTargetInstanceId,
          );
          return benchMon ? [benchMon] : [];
        }
        return [];

      case TargetType.SELECTED_OPPONENT_POKEMON:
        if (selectedTargetInstanceId) {
          if (opponent.active?.instanceId === selectedTargetInstanceId) {
            return [opponent.active];
          }
          const benchMon = opponent.bench.find(
            (p) => p.instanceId === selectedTargetInstanceId,
          );
          return benchMon ? [benchMon] : [];
        }
        return [];

      case TargetType.ANY:
        if (selectedTargetInstanceId) {
          const all = [
            source.active,
            ...source.bench,
            opponent.active,
            ...opponent.bench,
          ].filter(Boolean) as PokemonCardInGame[];
          const found = all.find(
            (p) => p.instanceId === selectedTargetInstanceId,
          );
          return found ? [found] : [];
        }
        return [];

      default:
        return [];
    }
  }
}
