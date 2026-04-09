import { Injectable } from "@nestjs/common";
import { ActionType, PlayerAction } from "../engine/actions/Action";
import { GameEngine } from "../engine/GameEngine";
import { GamePhase } from "../engine/models/enums";
import {
  CardInGame,
  PokemonCardInGame,
  TrainerCardInGame,
} from "../engine/models/Card";
import { GameState } from "../engine/models/GameState";
import { PromptResponse } from "../engine/models/Prompt";
import { TrainingDifficulty } from "../entities/training-match-session.entity";

export type TrainingAiDecision =
  | { kind: "action"; action: PlayerAction }
  | { kind: "prompt"; response: PromptResponse }
  | null;

@Injectable()
export class TrainingAiService {
  decideNextMove(
    engine: GameEngine,
    aiPlayerId: string,
    difficulty: TrainingDifficulty,
    seed: string,
  ): TrainingAiDecision {
    const state = engine.getState();

    if (state.gamePhase === GamePhase.Finished) {
      return null;
    }

    if (state.pendingPrompt) {
      if (state.pendingPrompt.playerId !== aiPlayerId) {
        return null;
      }

      return {
        kind: "prompt",
        response:
          difficulty === TrainingDifficulty.STANDARD
            ? this.choosePromptResponseStandard(state, aiPlayerId)
            : this.choosePromptResponseEasy(state, aiPlayerId),
      };
    }

    if (
      state.activePlayerId !== aiPlayerId ||
      state.gamePhase !== GamePhase.Play
    ) {
      return null;
    }

    return {
      kind: "action",
      action:
        difficulty === TrainingDifficulty.STANDARD
          ? this.choosePlayActionStandard(state, aiPlayerId, seed)
          : this.choosePlayActionEasy(state, aiPlayerId),
    };
  }

  private choosePromptResponseEasy(
    state: GameState,
    aiPlayerId: string,
  ): PromptResponse {
    const prompt = state.pendingPrompt;
    if (!prompt) {
      throw new Error("No AI prompt is available");
    }

    switch (prompt.type) {
      case "CHOOSE_FIRST_PLAYER":
        return {
          promptId: prompt.id,
          selections: [aiPlayerId],
        };
      case "CHOOSE_MULLIGAN_DRAW":
        return {
          promptId: prompt.id,
          numericChoice: Number(
            prompt.options[prompt.options.length - 1]?.value || 0,
          ),
        };
      default:
        return {
          promptId: prompt.id,
          selections: prompt.allowPass
            ? prompt.options
                .map((option) => option.value)
                .slice(0, prompt.maxSelections)
            : ([prompt.options[0]?.value].filter(Boolean) as string[]),
        };
    }
  }

  private choosePromptResponseStandard(
    state: GameState,
    aiPlayerId: string,
  ): PromptResponse {
    const prompt = state.pendingPrompt;
    if (!prompt) {
      throw new Error("No AI prompt is available");
    }

    switch (prompt.type) {
      case "CHOOSE_FIRST_PLAYER":
        return {
          promptId: prompt.id,
          selections: [
            state.playerIds.find((playerId) => playerId !== aiPlayerId)!,
          ],
        };
      case "CHOOSE_ACTIVE": {
        const selected = [...prompt.options].sort(
          (left, right) =>
            this.scorePokemonCardInHand(state, aiPlayerId, right.value) -
            this.scorePokemonCardInHand(state, aiPlayerId, left.value),
        )[0];
        return {
          promptId: prompt.id,
          selections: selected ? [selected.value] : [],
        };
      }
      case "CHOOSE_BENCH": {
        const selected = [...prompt.options]
          .sort(
            (left, right) =>
              this.scorePokemonCardInHand(state, aiPlayerId, right.value) -
              this.scorePokemonCardInHand(state, aiPlayerId, left.value),
          )
          .slice(0, prompt.maxSelections)
          .map((option) => option.value);
        return {
          promptId: prompt.id,
          selections: selected,
        };
      }
      case "CHOOSE_MULLIGAN_DRAW":
        return {
          promptId: prompt.id,
          numericChoice: Number(
            prompt.options[prompt.options.length - 1]?.value || 0,
          ),
        };
      case "CHOOSE_PROMOTION":
      case "CHOOSE_TRAINER_TARGET": {
        const selected = [...prompt.options].sort(
          (left, right) =>
            this.scorePokemonOnBoard(state, aiPlayerId, right.value) -
            this.scorePokemonOnBoard(state, aiPlayerId, left.value),
        )[0];
        return {
          promptId: prompt.id,
          selections: selected ? [selected.value] : [],
        };
      }
      default:
        throw new Error(`Unsupported AI prompt ${prompt.type}`);
    }
  }

  private choosePlayActionEasy(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction {
    const player = state.players[aiPlayerId];
    const active = player.active;
    const attackAction = this.findFirstPlayableAttack(state, aiPlayerId);

    const attachAction = this.findEasyAttachEnergyAction(state, aiPlayerId);
    if (attachAction) {
      return attachAction;
    }

    const evolutionAction = this.findFirstEvolutionAction(state, aiPlayerId);
    if (evolutionAction) {
      return evolutionAction;
    }

    const trainerAction = this.findFirstTrainerAction(state, aiPlayerId);
    if (trainerAction) {
      return trainerAction;
    }

    const benchAction = this.findFirstBenchAction(state, aiPlayerId);
    if (benchAction) {
      return benchAction;
    }

    if (attackAction) {
      return attackAction;
    }

    if (active) {
      const retreatAction = this.findSimpleRetreatAction(state, aiPlayerId);
      if (retreatAction) {
        return retreatAction;
      }
    }

    return {
      playerId: aiPlayerId,
      type: ActionType.END_TURN,
    };
  }

  private choosePlayActionStandard(
    state: GameState,
    aiPlayerId: string,
    seed: string,
  ): PlayerAction {
    const candidates = this.buildPlayCandidates(state, aiPlayerId);

    let bestCandidate: { action: PlayerAction; score: number } | null = null;

    for (const action of candidates) {
      const simulated = this.simulateAction(state, action);
      if (!simulated) {
        continue;
      }

      const score =
        this.scoreSimulatedAction(state, simulated, aiPlayerId, action) +
        this.tieBreaker(seed, action);

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { action, score };
      }
    }

    return (
      bestCandidate?.action || {
        playerId: aiPlayerId,
        type: ActionType.END_TURN,
      }
    );
  }

  private buildPlayCandidates(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction[] {
    const player = state.players[aiPlayerId];
    const candidates: PlayerAction[] = [];
    const boardTargets = [player.active, ...player.bench].filter(
      (pokemon): pokemon is PokemonCardInGame => Boolean(pokemon),
    );

    for (const card of player.hand) {
      if (
        card.baseCard.category === "Pokémon" &&
        (card.baseCard as PokemonCardInGame["baseCard"]).stage === "De base"
      ) {
        candidates.push({
          playerId: aiPlayerId,
          type: ActionType.PLAY_POKEMON_TO_BENCH,
          payload: { cardInstanceId: card.instanceId },
        });
      }

      if (card.baseCard.category === "Énergie") {
        for (const target of boardTargets) {
          candidates.push({
            playerId: aiPlayerId,
            type: ActionType.ATTACH_ENERGY,
            payload: {
              energyCardInstanceId: card.instanceId,
              targetPokemonInstanceId: target.instanceId,
            },
          });
        }
      }

      if (
        card.baseCard.category === "Pokémon" &&
        (card.baseCard as PokemonCardInGame["baseCard"]).stage !== "De base"
      ) {
        for (const target of boardTargets) {
          candidates.push({
            playerId: aiPlayerId,
            type: ActionType.EVOLVE_POKEMON,
            payload: {
              evolutionCardInstanceId: card.instanceId,
              targetPokemonInstanceId: target.instanceId,
            },
          });
        }
      }

      if (card.baseCard.category === "Dresseur") {
        candidates.push({
          playerId: aiPlayerId,
          type: ActionType.PLAY_TRAINER,
          payload: { trainerCardInstanceId: card.instanceId },
        });
      }
    }

    for (const attackIndex of player.active?.baseCard.attacks.map(
      (_, index) => index,
    ) || []) {
      candidates.push({
        playerId: aiPlayerId,
        type: ActionType.ATTACK,
        payload: { attackIndex },
      });
    }

    if (player.active) {
      const retreatCost = player.active.baseCard.retreat || 0;
      const discardedEnergyInstanceIds = player.active.attachedEnergies
        .slice(0, retreatCost)
        .map((energy) => energy.instanceId);

      for (const benchPokemon of player.bench) {
        candidates.push({
          playerId: aiPlayerId,
          type: ActionType.RETREAT,
          payload: {
            benchPokemonInstanceId: benchPokemon.instanceId,
            discardedEnergyInstanceIds,
          },
        });
      }
    }

    candidates.push({
      playerId: aiPlayerId,
      type: ActionType.END_TURN,
    });

    return candidates;
  }

  private findEasyAttachEnergyAction(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction | null {
    const player = state.players[aiPlayerId];
    const energyCard = player.hand.find(
      (card) => card.baseCard.category === "Énergie",
    );
    if (!energyCard) {
      return null;
    }

    const target = player.active || player.bench[0];
    if (!target) {
      return null;
    }

    return {
      playerId: aiPlayerId,
      type: ActionType.ATTACH_ENERGY,
      payload: {
        energyCardInstanceId: energyCard.instanceId,
        targetPokemonInstanceId: target.instanceId,
      },
    };
  }

  private findFirstEvolutionAction(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction | null {
    const player = state.players[aiPlayerId];
    const boardTargets = [player.active, ...player.bench].filter(
      (pokemon): pokemon is PokemonCardInGame => Boolean(pokemon),
    );

    for (const card of player.hand) {
      if (
        card.baseCard.category !== "Pokémon" ||
        (card.baseCard as PokemonCardInGame["baseCard"]).stage === "De base"
      ) {
        continue;
      }

      for (const target of boardTargets) {
        const action: PlayerAction = {
          playerId: aiPlayerId,
          type: ActionType.EVOLVE_POKEMON,
          payload: {
            evolutionCardInstanceId: card.instanceId,
            targetPokemonInstanceId: target.instanceId,
          },
        };

        if (this.simulateAction(state, action)) {
          return action;
        }
      }
    }

    return null;
  }

  private findFirstTrainerAction(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction | null {
    const player = state.players[aiPlayerId];

    for (const card of player.hand) {
      if (card.baseCard.category !== "Dresseur") {
        continue;
      }

      const baseCard = card.baseCard as TrainerCardInGame["baseCard"];
      if (
        baseCard.targetStrategy === "OWN_POKEMON" &&
        !this.hasValuableTrainerTarget(state, aiPlayerId)
      ) {
        continue;
      }

      const action: PlayerAction = {
        playerId: aiPlayerId,
        type: ActionType.PLAY_TRAINER,
        payload: { trainerCardInstanceId: card.instanceId },
      };

      if (this.simulateAction(state, action)) {
        return action;
      }
    }

    return null;
  }

  private findFirstBenchAction(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction | null {
    const player = state.players[aiPlayerId];

    for (const card of player.hand) {
      if (
        card.baseCard.category === "Pokémon" &&
        (card.baseCard as PokemonCardInGame["baseCard"]).stage === "De base"
      ) {
        const action: PlayerAction = {
          playerId: aiPlayerId,
          type: ActionType.PLAY_POKEMON_TO_BENCH,
          payload: { cardInstanceId: card.instanceId },
        };

        if (this.simulateAction(state, action)) {
          return action;
        }
      }
    }

    return null;
  }

  private findFirstPlayableAttack(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction | null {
    const attacks = state.players[aiPlayerId].active?.baseCard.attacks || [];

    for (const [attackIndex] of attacks.entries()) {
      const action: PlayerAction = {
        playerId: aiPlayerId,
        type: ActionType.ATTACK,
        payload: { attackIndex },
      };

      if (this.simulateAction(state, action)) {
        return action;
      }
    }

    return null;
  }

  private findSimpleRetreatAction(
    state: GameState,
    aiPlayerId: string,
  ): PlayerAction | null {
    const player = state.players[aiPlayerId];
    if (!player.active || player.bench.length === 0) {
      return null;
    }

    if (this.findFirstPlayableAttack(state, aiPlayerId)) {
      return null;
    }

    const retreatCost = player.active.baseCard.retreat || 0;
    const discardedEnergyInstanceIds = player.active.attachedEnergies
      .slice(0, retreatCost)
      .map((energy) => energy.instanceId);

    for (const benchPokemon of player.bench) {
      const action: PlayerAction = {
        playerId: aiPlayerId,
        type: ActionType.RETREAT,
        payload: {
          benchPokemonInstanceId: benchPokemon.instanceId,
          discardedEnergyInstanceIds,
        },
      };

      if (this.simulateAction(state, action)) {
        return action;
      }
    }

    return null;
  }

  private simulateAction(
    state: GameState,
    action: PlayerAction,
  ): GameState | null {
    try {
      const engine = new GameEngine(structuredClone(state));
      engine.dispatch(action);
      return engine.getState();
    } catch {
      return null;
    }
  }

  private scoreSimulatedAction(
    previousState: GameState,
    nextState: GameState,
    aiPlayerId: string,
    action: PlayerAction,
  ): number {
    const baseScore =
      this.scoreState(nextState, aiPlayerId) -
      this.scoreState(previousState, aiPlayerId);
    const aiPlayer = previousState.players[aiPlayerId];
    const opponentId = previousState.playerIds.find(
      (playerId) => playerId !== aiPlayerId,
    )!;
    const opponentPlayer = previousState.players[opponentId];

    switch (action.type) {
      case ActionType.ATTACK: {
        const attack =
          aiPlayer.active?.baseCard.attacks[action.payload?.attackIndex || 0];
        const estimatedDamage = this.parseDamageValue(attack?.damage);
        const wouldKnockOut =
          Boolean(opponentPlayer.active) &&
          estimatedDamage >=
            Math.max(
              0,
              (opponentPlayer.active?.baseCard.hp || 0) -
                (opponentPlayer.active?.damageCounters || 0),
            );

        return baseScore + (wouldKnockOut ? 5000 : estimatedDamage * 15 + 500);
      }
      case ActionType.EVOLVE_POKEMON:
        return baseScore + 350;
      case ActionType.ATTACH_ENERGY:
        return (
          baseScore +
          (this.hasPlayableAttack(nextState, aiPlayerId) ? 320 : 180)
        );
      case ActionType.PLAY_TRAINER:
        return (
          baseScore +
          this.estimateTrainerValue(previousState, aiPlayerId, action)
        );
      case ActionType.PLAY_POKEMON_TO_BENCH:
        return baseScore + (aiPlayer.bench.length === 0 ? 220 : 120);
      case ActionType.RETREAT:
        return (
          baseScore +
          (this.hasPlayableAttack(nextState, aiPlayerId) ? 280 : -120)
        );
      case ActionType.END_TURN:
      default:
        return baseScore;
    }
  }

  private scoreState(state: GameState, aiPlayerId: string): number {
    const opponentId = state.playerIds.find(
      (playerId) => playerId !== aiPlayerId,
    )!;
    const aiPlayer = state.players[aiPlayerId];
    const opponent = state.players[opponentId];

    if (state.gamePhase === GamePhase.Finished) {
      return state.winnerId === aiPlayerId ? 100000 : -100000;
    }

    const aiBoardScore = this.scoreBoard(aiPlayer);
    const opponentBoardScore = this.scoreBoard(opponent);
    const prizeDelta =
      aiPlayer.prizeCardsTaken * 600 - opponent.prizeCardsTaken * 600;
    const activeTurnBonus = state.activePlayerId === aiPlayerId ? 120 : -40;
    const promptPressure =
      state.pendingPrompt?.playerId === aiPlayerId
        ? 80
        : state.pendingPrompt
          ? -30
          : 0;

    return (
      aiBoardScore -
      opponentBoardScore +
      prizeDelta +
      activeTurnBonus +
      promptPressure
    );
  }

  private scoreBoard(player: GameState["players"][string]): number {
    const activeScore = player.active
      ? this.scorePokemon(player.active) + 150
      : -1000;
    const benchScore = player.bench.reduce(
      (sum, pokemon) => sum + this.scorePokemon(pokemon),
      0,
    );

    return (
      activeScore +
      benchScore +
      player.hand.length * 20 +
      player.deck.length * 2 +
      player.prizes.length * -10
    );
  }

  private scorePokemon(pokemon: PokemonCardInGame): number {
    const hpRemaining = Math.max(
      0,
      pokemon.baseCard.hp - pokemon.damageCounters,
    );
    const bestAttack = Math.max(
      0,
      ...pokemon.baseCard.attacks.map((attack) =>
        this.parseDamageValue(attack.damage),
      ),
    );

    return (
      hpRemaining * 3 +
      pokemon.attachedEnergies.length * 40 +
      pokemon.attachedEvolutions.length * 35 +
      bestAttack * 5 -
      pokemon.specialConditions.length * 45
    );
  }

  private scorePokemonCardInHand(
    state: GameState,
    playerId: string,
    instanceId: string,
  ): number {
    const card = state.players[playerId].hand.find(
      (entry) => entry.instanceId === instanceId,
    );

    if (!card || card.baseCard.category !== "Pokémon") {
      return -Infinity;
    }

    const pokemon = card as PokemonCardInGame;
    return (
      pokemon.baseCard.hp +
      Math.max(
        0,
        ...pokemon.baseCard.attacks.map((attack) =>
          this.parseDamageValue(attack.damage),
        ),
      ) *
        4
    );
  }

  private scorePokemonOnBoard(
    state: GameState,
    playerId: string,
    instanceId: string,
  ): number {
    const player = state.players[playerId];
    const pokemon =
      player.active?.instanceId === instanceId
        ? player.active
        : player.bench.find((entry) => entry.instanceId === instanceId) || null;

    if (!pokemon) {
      return -Infinity;
    }

    return (
      this.scorePokemon(pokemon) +
      pokemon.damageCounters * 4 +
      pokemon.specialConditions.length * 60
    );
  }

  private estimateTrainerValue(
    state: GameState,
    aiPlayerId: string,
    action: PlayerAction,
  ): number {
    const trainerCard = state.players[aiPlayerId].hand.find(
      (card) => card.instanceId === action.payload?.trainerCardInstanceId,
    ) as TrainerCardInGame | undefined;

    if (!trainerCard) {
      return 0;
    }

    if (trainerCard.baseCard.targetStrategy !== "OWN_POKEMON") {
      return 100;
    }

    const targets = [
      state.players[aiPlayerId].active,
      ...state.players[aiPlayerId].bench,
    ].filter((pokemon): pokemon is PokemonCardInGame => Boolean(pokemon));

    return targets.reduce((best, pokemon) => {
      const value =
        pokemon.damageCounters * 4 + pokemon.specialConditions.length * 80;
      return Math.max(best, value);
    }, 0);
  }

  private hasValuableTrainerTarget(
    state: GameState,
    aiPlayerId: string,
  ): boolean {
    const targets = [
      state.players[aiPlayerId].active,
      ...state.players[aiPlayerId].bench,
    ].filter((pokemon): pokemon is PokemonCardInGame => Boolean(pokemon));

    return targets.some(
      (pokemon) =>
        pokemon.damageCounters > 0 || pokemon.specialConditions.length > 0,
    );
  }

  private hasPlayableAttack(state: GameState, aiPlayerId: string): boolean {
    return Boolean(this.findFirstPlayableAttack(state, aiPlayerId));
  }

  private parseDamageValue(value?: number | string): number {
    if (typeof value === "number") {
      return value;
    }

    if (!value) {
      return 0;
    }

    const matched = String(value).match(/\d+/);
    return matched ? Number(matched[0]) : 0;
  }

  private tieBreaker(seed: string, action: PlayerAction): number {
    const key = `${seed}:${action.type}:${JSON.stringify(action.payload || {})}`;
    let hash = 0;

    for (const char of key) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    return hash / 1000000000;
  }
}
