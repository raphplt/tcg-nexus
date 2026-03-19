import {
  AttachEnergyAction,
  AttackAction,
  EvolvePokemonAction,
  PlayPokemonAction,
  PlayTrainerAction,
  PlayerAction,
  RetreatAction,
} from "./actions/Action";
import { EffectResolver } from "./effects/EffectResolver";
import { TargetType } from "./effects/Effect";
import {
  CardCategory,
  GameFinishedReason,
  GamePhase,
  PromptType,
  SpecialCondition,
  TurnStep,
} from "./models/enums";
import {
  Attack,
  CardInGame,
  EnergyCardInGame,
  PokemonCardInGame,
  TrainerCardInGame,
} from "./models/Card";
import { GameState } from "./models/GameState";
import { PendingPrompt, PromptOption, PromptResponse } from "./models/Prompt";
import { SetupTask, SetupTaskType } from "./models/Setup";

export class GameEngine {
  private state: GameState;
  private effectResolver: EffectResolver;

  constructor(initialState: GameState) {
    this.state = initialState;
    this.effectResolver = new EffectResolver(this);
  }

  public getState(): GameState {
    return this.state;
  }

  public getSanitizedState(viewerPlayerId: string) {
    return {
      id: this.state.id,
      gamePhase: this.state.gamePhase,
      turnStep: this.state.turnStep,
      activePlayerId: this.state.activePlayerId,
      firstPlayerId: this.state.firstPlayerId,
      turnNumber: this.state.turnNumber,
      winnerId: this.state.winnerId,
      winnerReason: this.state.winnerReason,
      awaitingPlayerId: this.state.pendingPrompt?.playerId || null,
      pendingPrompt:
        this.state.pendingPrompt?.playerId === viewerPlayerId
          ? this.state.pendingPrompt
          : null,
      players: Object.fromEntries(
        this.state.playerIds.map((playerId) => {
          const player = this.state.players[playerId];
          const isViewer = playerId === viewerPlayerId;
          const hideBoard =
            this.state.gamePhase === GamePhase.Setup && !isViewer;

          return [
            playerId,
            {
              playerId: player.playerId,
              name: player.name,
              deckCount: player.deck.length,
              handCount: player.hand.length,
              prizesRemaining: player.prizes.length,
              prizeCardsTaken: player.prizeCardsTaken,
              active: hideBoard ? null : this.serializePokemon(player.active),
              bench: hideBoard
                ? []
                : player.bench.map((pokemon) => this.serializePokemon(pokemon)),
              discard: player.discard.map((card) =>
                this.serializeHandCard(card),
              ),
              hand: isViewer
                ? player.hand.map((card) => this.serializeHandCard(card))
                : undefined,
            },
          ];
        }),
      ),
    };
  }

  public dispatch(action: PlayerAction): any[] {
    const events: any[] = [];

    if (this.state.gamePhase === GamePhase.Finished) {
      throw new Error("Game is already finished");
    }

    if (this.state.gamePhase === GamePhase.Setup) {
      throw new Error("Setup must be resolved through prompts");
    }

    if (this.state.pendingPrompt) {
      throw new Error(
        "A prompt must be resolved before playing another action",
      );
    }

    if (this.state.activePlayerId !== action.playerId) {
      throw new Error("Not your turn");
    }

    switch (action.type) {
      case "PLAY_POKEMON_TO_BENCH":
        this.playPokemonToBench(action as PlayPokemonAction, events);
        break;
      case "EVOLVE_POKEMON":
        this.evolvePokemon(action as EvolvePokemonAction, events);
        break;
      case "ATTACH_ENERGY":
        this.attachEnergy(action as AttachEnergyAction, events);
        break;
      case "PLAY_TRAINER":
        this.playTrainer(action as PlayTrainerAction, events);
        break;
      case "ATTACK":
        this.attack(action as AttackAction, events);
        break;
      case "RETREAT":
        this.retreat(action as RetreatAction, events);
        break;
      case "END_TURN":
        this.endTurn(events);
        break;
      default:
        throw new Error(`Action ${action.type} not implemented`);
    }

    return events;
  }

  public respondToPrompt(playerId: string, response: PromptResponse): any[] {
    const events: any[] = [];
    const prompt = this.state.pendingPrompt;

    if (!prompt) {
      throw new Error("No prompt is currently pending");
    }

    if (prompt.playerId !== playerId) {
      throw new Error("This prompt is not assigned to you");
    }

    if (prompt.id !== response.promptId) {
      throw new Error("Prompt mismatch");
    }

    switch (prompt.type) {
      case PromptType.ChooseFirstPlayer:
        this.handleChooseFirstPlayer(response, events);
        break;
      case PromptType.ChooseActive:
        this.handleChooseActive(playerId, response, events);
        break;
      case PromptType.ChooseBench:
        this.handleChooseBench(playerId, response, events);
        break;
      case PromptType.ChooseMulliganDraw:
        this.handleChooseMulliganDraw(playerId, response, events);
        break;
      case PromptType.ChoosePromotion:
        this.handleChoosePromotion(playerId, response, events);
        break;
      case PromptType.ChooseTrainerTarget:
        this.handleChooseTrainerTarget(playerId, response, events);
        break;
      default:
        throw new Error(`Prompt ${prompt.type} is not supported`);
    }

    if (this.state.pendingPrompt === prompt) {
      this.state.pendingPrompt = null;
    }

    if (!this.state.pendingPrompt) {
      this.advanceSetup(events);
    }

    if (this.state.resumeAction && !this.state.pendingPrompt) {
      const resumeAction = this.state.resumeAction;
      this.state.resumeAction = null;
      if (resumeAction === "AFTER_ATTACK_PROMOTION") {
        this.endTurn(events);
      } else if (resumeAction === "AFTER_CHECKUP_PROMOTION") {
        this.finishPendingTurnTransition(events);
      }
    }

    return events;
  }

  public nextRandom(): number {
    this.state.rngState =
      (this.state.rngState * 1664525 + 1013904223) % 4294967296;
    return this.state.rngState / 4294967296;
  }

  public drawCardForEffect(playerId: string, events: any[]): boolean {
    return this.drawCard(playerId, events, false);
  }

  public applySpecialCondition(
    currentConditions: SpecialCondition[],
    condition: SpecialCondition,
  ): SpecialCondition[] {
    const nextConditions = new Set(currentConditions);
    if (
      condition === SpecialCondition.Asleep ||
      condition === SpecialCondition.Paralyzed
    ) {
      nextConditions.delete(SpecialCondition.Asleep);
      nextConditions.delete(SpecialCondition.Paralyzed);
    }
    nextConditions.add(condition);
    return Array.from(nextConditions);
  }

  public discardAttachedEnergy(
    sourcePlayerId: string,
    target: TargetType,
    amount: number,
    events: any[],
  ) {
    const opponentId = this.getOpponentId(sourcePlayerId);
    const playerId =
      target === TargetType.OPPONENT_ACTIVE ? opponentId : sourcePlayerId;
    const pokemon = this.state.players[playerId].active;

    if (!pokemon || amount <= 0) {
      return;
    }

    const discarded = pokemon.attachedEnergies.splice(
      Math.max(0, pokemon.attachedEnergies.length - amount),
      amount,
    );
    this.state.players[playerId].discard.push(...discarded);

    if (discarded.length > 0) {
      events.push({
        type: "ENERGY_DISCARDED",
        playerId,
        targetInstanceId: pokemon.instanceId,
        count: discarded.length,
      });
    }
  }

  private handleChooseFirstPlayer(response: PromptResponse, events: any[]) {
    const selected = response.selections?.[0];
    if (!selected || !this.state.playerIds.includes(selected as any)) {
      throw new Error("Invalid starting player selection");
    }

    const firstPlayerId = selected;
    const secondPlayerId = this.getOpponentId(firstPlayerId);

    this.state.firstPlayerId = firstPlayerId;
    this.state.activePlayerId = firstPlayerId;
    this.state.turnNumber = 1;

    this.prepareOpeningHands(events);

    if (!this.state.setup) {
      throw new Error("Setup state is missing");
    }

    this.state.setup.tasks = [
      this.createSetupTask("CHOOSE_ACTIVE", firstPlayerId),
      this.createSetupTask("CHOOSE_BENCH", firstPlayerId),
      this.createSetupTask("CHOOSE_ACTIVE", secondPlayerId),
      this.createSetupTask("CHOOSE_BENCH", secondPlayerId),
    ];

    if (this.state.setup.mulliganCounts[secondPlayerId] > 0) {
      this.state.setup.tasks.push(
        this.createSetupTask("CHOOSE_MULLIGAN_DRAW", firstPlayerId, {
          maxCount: this.state.setup.mulliganCounts[secondPlayerId],
        }),
        this.createSetupTask("CHOOSE_BENCH", firstPlayerId, {
          reason: "MULLIGAN_BONUS",
        }),
      );
    }

    if (this.state.setup.mulliganCounts[firstPlayerId] > 0) {
      this.state.setup.tasks.push(
        this.createSetupTask("CHOOSE_MULLIGAN_DRAW", secondPlayerId, {
          maxCount: this.state.setup.mulliganCounts[firstPlayerId],
        }),
        this.createSetupTask("CHOOSE_BENCH", secondPlayerId, {
          reason: "MULLIGAN_BONUS",
        }),
      );
    }

    this.state.setup.tasks.push(this.createSetupTask("FINALIZE_SETUP"));
    events.push({
      type: "FIRST_PLAYER_CHOSEN",
      playerId: firstPlayerId,
    });
  }

  private handleChooseActive(
    playerId: string,
    response: PromptResponse,
    events: any[],
  ) {
    const cardInstanceId = response.selections?.[0];
    if (!cardInstanceId) {
      throw new Error("You must choose an active Pokemon");
    }

    const pokemon = this.takePokemonFromHand(playerId, cardInstanceId);
    if (pokemon.baseCard.stage !== "De base") {
      throw new Error("Only a Basic Pokemon can become active during setup");
    }

    this.state.players[playerId].active = pokemon;
    events.push({
      type: "ACTIVE_POKEMON_CHOSEN",
      playerId,
      cardInstanceId,
    });
  }

  private handleChooseBench(
    playerId: string,
    response: PromptResponse,
    events: any[],
  ) {
    const selections = response.selections || [];
    const player = this.state.players[playerId];
    const benchSpace = 5 - player.bench.length;

    if (selections.length > benchSpace) {
      throw new Error("Too many Pokemon selected for the bench");
    }

    const uniqueSelections = new Set(selections);
    if (uniqueSelections.size !== selections.length) {
      throw new Error("Duplicate Pokemon selected for the bench");
    }

    for (const cardInstanceId of selections) {
      const pokemon = this.takePokemonFromHand(playerId, cardInstanceId);
      if (pokemon.baseCard.stage !== "De base") {
        throw new Error("Only Basic Pokemon can be benched during setup");
      }
      player.bench.push(pokemon);
    }

    events.push({
      type: "BENCH_UPDATED",
      playerId,
      count: selections.length,
    });
  }

  private handleChooseMulliganDraw(
    playerId: string,
    response: PromptResponse,
    events: any[],
  ) {
    const maxCount = Number(this.state.pendingPrompt?.metadata?.maxCount || 0);
    const requested =
      typeof response.numericChoice === "number"
        ? response.numericChoice
        : Number(response.selections?.[0] || 0);

    if (!Number.isInteger(requested) || requested < 0 || requested > maxCount) {
      throw new Error("Invalid mulligan draw count");
    }

    for (let index = 0; index < requested; index += 1) {
      this.drawCard(playerId, events, false);
    }

    if (this.state.setup) {
      this.state.setup.mulliganBonusDraws[playerId] = requested;
    }

    events.push({
      type: "MULLIGAN_BONUS_DRAWN",
      playerId,
      count: requested,
    });
  }

  private handleChoosePromotion(
    playerId: string,
    response: PromptResponse,
    events: any[],
  ) {
    const selectedInstanceId = response.selections?.[0];
    if (!selectedInstanceId) {
      throw new Error("You must choose a Pokemon to promote");
    }

    const player = this.state.players[playerId];
    const benchIndex = player.bench.findIndex(
      (pokemon) => pokemon.instanceId === selectedInstanceId,
    );
    if (benchIndex === -1) {
      throw new Error("Selected Pokemon is not on your bench");
    }

    const [promotedPokemon] = player.bench.splice(benchIndex, 1);
    player.active = promotedPokemon;

    events.push({
      type: "ACTIVE_POKEMON_PROMOTED",
      playerId,
      cardInstanceId: promotedPokemon.instanceId,
    });
  }

  private handleChooseTrainerTarget(
    playerId: string,
    response: PromptResponse,
    events: any[],
  ) {
    const selectedInstanceId = response.selections?.[0];
    if (!selectedInstanceId) {
      throw new Error("You must choose a valid target");
    }

    const pendingTrainerPlay = this.state.pendingTrainerPlay;
    if (!pendingTrainerPlay || pendingTrainerPlay.playerId !== playerId) {
      throw new Error("No trainer play is waiting for a target");
    }

    const target = this.findPokemonOnBoard(playerId, selectedInstanceId);
    if (!target) {
      throw new Error("Selected target is not on your board");
    }

    this.effectResolver.resolveEffects(
      pendingTrainerPlay.effects,
      playerId,
      events,
      {
        selectedTargetInstanceId: selectedInstanceId,
      },
    );
    this.moveTrainerFromHandToDiscard(
      playerId,
      pendingTrainerPlay.trainerCardInstanceId,
      events,
    );
    this.state.pendingTrainerPlay = null;

    if (this.state.gamePhase !== GamePhase.Finished) {
      this.resolveKnockoutAfterAction(events);
    }
  }

  private advanceSetup(events: any[]) {
    if (
      this.state.gamePhase !== GamePhase.Setup ||
      this.state.pendingPrompt ||
      !this.state.setup
    ) {
      return;
    }

    while (!this.state.pendingPrompt && this.state.setup && this.state.setup.tasks.length > 0) {
      const task = this.state.setup.tasks.shift()!;

      if (task.type === "FINALIZE_SETUP") {
        this.finalizeSetup(events);
        continue;
      }

      const prompt = this.createPromptForTask(task);
      if (!prompt) {
        continue;
      }

      this.state.pendingPrompt = prompt;
    }
  }

  private createPromptForTask(task: SetupTask): PendingPrompt | null {
    switch (task.type) {
      case "CHOOSE_FIRST_PLAYER":
        return this.buildPrompt({
          playerId: task.playerId || this.state.setup?.coinFlipWinnerId || "",
          type: PromptType.ChooseFirstPlayer,
          title: "Choisissez le premier joueur",
          minSelections: 1,
          maxSelections: 1,
          allowPass: false,
          options: this.state.playerIds.map((playerId) => ({
            value: playerId,
            label: this.state.players[playerId].name,
          })),
          metadata: task.metadata,
        });
      case "CHOOSE_ACTIVE": {
        const playerId = task.playerId!;
        const basicPokemonOptions = this.state.players[playerId].hand
          .filter(
            (card) =>
              card.baseCard.category === CardCategory.Pokemon &&
              (card as PokemonCardInGame).baseCard.stage === "De base",
          )
          .map((card) => ({
            value: card.instanceId,
            label: card.baseCard.name,
          }));

        return this.buildPrompt({
          playerId,
          type: PromptType.ChooseActive,
          title: "Choisissez votre Pokemon Actif",
          minSelections: 1,
          maxSelections: 1,
          allowPass: false,
          options: basicPokemonOptions,
          metadata: task.metadata,
        });
      }
      case "CHOOSE_BENCH": {
        const playerId = task.playerId!;
        const player = this.state.players[playerId];
        const benchOptions = player.hand
          .filter(
            (card) =>
              card.baseCard.category === CardCategory.Pokemon &&
              (card as PokemonCardInGame).baseCard.stage === "De base",
          )
          .map((card) => ({
            value: card.instanceId,
            label: card.baseCard.name,
          }));

        if (benchOptions.length === 0 || player.bench.length >= 5) {
          return null;
        }

        return this.buildPrompt({
          playerId,
          type: PromptType.ChooseBench,
          title: "Choisissez vos Pokemon de Banc",
          minSelections: 0,
          maxSelections: Math.min(5 - player.bench.length, benchOptions.length),
          allowPass: true,
          options: benchOptions,
          metadata: task.metadata,
        });
      }
      case "CHOOSE_MULLIGAN_DRAW": {
        const playerId = task.playerId!;
        const maxCount = Number(task.metadata?.maxCount || 0);
        return this.buildPrompt({
          playerId,
          type: PromptType.ChooseMulliganDraw,
          title: "Choisissez combien de cartes piocher apres la mulligan",
          minSelections: 0,
          maxSelections: 1,
          allowPass: false,
          options: Array.from({ length: maxCount + 1 }, (_, index) => ({
            value: String(index),
            label: `${index} carte${index > 1 ? "s" : ""}`,
          })),
          metadata: task.metadata,
        });
      }
      default:
        return null;
    }
  }

  private finalizeSetup(events: any[]) {
    if (!this.state.firstPlayerId) {
      throw new Error(
        "The starting player must be selected before finalizing setup",
      );
    }

    for (const playerId of this.state.playerIds) {
      const player = this.state.players[playerId];

      if (!player.active) {
        throw new Error(
          "Each player must have an active Pokemon before the game starts",
        );
      }

      if (player.prizes.length === 0) {
        for (let index = 0; index < 6; index += 1) {
          const prizeCard = player.deck.pop();
          if (!prizeCard) {
            throw new Error(
              "Deck does not contain enough cards to set prize cards",
            );
          }
          player.prizes.push(prizeCard);
        }
      }

      player.turnsTaken = 0;
      this.resetTurnFlags(playerId);
    }

    this.state.gamePhase = GamePhase.Play;
    this.state.turnStep = TurnStep.Main;
    this.state.pendingPrompt = null;
    this.state.pendingTurnTransitionToPlayerId = null;
    this.state.resumeAction = null;
    this.state.setup = null;

    this.startOpeningTurn(events);
  }

  private startOpeningTurn(events: any[]) {
    if (!this.state.firstPlayerId) {
      throw new Error("First player is missing");
    }

    this.state.activePlayerId = this.state.firstPlayerId;
    this.state.turnNumber = 1;
    events.push({
      type: "SETUP_COMPLETED",
      activePlayerId: this.state.firstPlayerId,
    });
  }

  private endTurn(events: any[]) {
    const currentPlayerId = this.state.activePlayerId;
    const nextPlayerId = this.getOpponentId(currentPlayerId);

    this.state.players[currentPlayerId].turnsTaken =
      (this.state.players[currentPlayerId].turnsTaken || 0) + 1;

    this.state.pendingTurnTransitionToPlayerId = nextPlayerId;
    this.state.turnStep = TurnStep.PokemonCheckup;

    this.pokemonCheckup(events);

    if (
      this.state.gamePhase === GamePhase.Finished ||
      this.state.pendingPrompt
    ) {
      return;
    }

    this.finishPendingTurnTransition(events);
  }

  private finishPendingTurnTransition(events: any[]) {
    const previousPlayerId = this.state.activePlayerId;
    const nextPlayerId =
      this.state.pendingTurnTransitionToPlayerId ||
      this.getOpponentId(previousPlayerId);

    this.state.pendingTurnTransitionToPlayerId = null;
    this.state.activePlayerId = nextPlayerId;
    this.state.turnNumber += 1;
    this.state.turnStep = TurnStep.Draw;

    this.resetTurnFlags(nextPlayerId);
    this.incrementTurnsInPlay(nextPlayerId);

    events.push({
      type: "TURN_ENDED",
      previousPlayerId,
      newActivePlayer: nextPlayerId,
      turnNumber: this.state.turnNumber,
    });

    this.drawCard(nextPlayerId, events, true);
    if (this.state.gamePhase === GamePhase.Finished) {
      return;
    }

    this.state.turnStep = TurnStep.Main;
  }

  private pokemonCheckup(events: any[]) {
    const activeSnapshots = this.state.playerIds.map((playerId) => ({
      playerId,
      pokemon: this.state.players[playerId].active,
    }));

    for (const snapshot of activeSnapshots) {
      const activePokemon = snapshot.pokemon;
      if (!activePokemon) {
        continue;
      }

      if (activePokemon.specialConditions.includes(SpecialCondition.Poisoned)) {
        activePokemon.damageCounters += 10;
        events.push({
          type: "POISON_DAMAGE_APPLIED",
          playerId: snapshot.playerId,
          targetInstanceId: activePokemon.instanceId,
          amount: 10,
        });
      }

      if (activePokemon.specialConditions.includes(SpecialCondition.Burned)) {
        activePokemon.damageCounters += 20;
        events.push({
          type: "BURN_DAMAGE_APPLIED",
          playerId: snapshot.playerId,
          targetInstanceId: activePokemon.instanceId,
          amount: 20,
        });

        if (this.nextRandom() >= 0.5) {
          activePokemon.specialConditions =
            activePokemon.specialConditions.filter(
              (condition) => condition !== SpecialCondition.Burned,
            );
          events.push({
            type: "BURN_REMOVED",
            playerId: snapshot.playerId,
            targetInstanceId: activePokemon.instanceId,
          });
        }
      }

      if (activePokemon.specialConditions.includes(SpecialCondition.Asleep)) {
        if (this.nextRandom() >= 0.5) {
          activePokemon.specialConditions =
            activePokemon.specialConditions.filter(
              (condition) => condition !== SpecialCondition.Asleep,
            );
          events.push({
            type: "ASLEEP_REMOVED",
            playerId: snapshot.playerId,
            targetInstanceId: activePokemon.instanceId,
          });
        }
      }

      if (
        snapshot.playerId === this.state.activePlayerId &&
        activePokemon.specialConditions.includes(SpecialCondition.Paralyzed)
      ) {
        activePokemon.specialConditions =
          activePokemon.specialConditions.filter(
            (condition) => condition !== SpecialCondition.Paralyzed,
          );
        events.push({
          type: "PARALYSIS_REMOVED",
          playerId: snapshot.playerId,
          targetInstanceId: activePokemon.instanceId,
        });
      }
    }

    this.resolveKnockoutAfterAction(events, "AFTER_CHECKUP_PROMOTION");
  }

  private drawCard(
    playerId: string,
    events: any[],
    loseOnEmptyDraw: boolean,
  ): boolean {
    const player = this.state.players[playerId];
    if (player.deck.length === 0) {
      if (loseOnEmptyDraw) {
        this.finishGame(
          this.getOpponentId(playerId),
          GameFinishedReason.DeckOut,
          events,
        );
      }
      return false;
    }

    const card = player.deck.pop()!;
    player.hand.push(card);
    events.push({ type: "CARD_DRAWN", playerId, count: 1 });
    return true;
  }

  private playPokemonToBench(action: PlayPokemonAction, events: any[]) {
    const player = this.state.players[action.playerId];
    if (player.bench.length >= 5) {
      throw new Error("Bench is full");
    }

    const pokemonCard = this.takePokemonFromHand(
      action.playerId,
      action.payload.cardInstanceId,
    );
    if (pokemonCard.baseCard.stage !== "De base") {
      throw new Error("Can only play Basic Pokemon directly to bench");
    }

    if (!player.active) {
      player.active = pokemonCard;
    } else {
      player.bench.push(pokemonCard);
    }

    events.push({
      type: "POKEMON_PLAYED",
      playerId: action.playerId,
      cardInstanceId: action.payload.cardInstanceId,
    });
  }

  private attachEnergy(action: AttachEnergyAction, events: any[]) {
    const player = this.state.players[action.playerId];

    if (player.hasAttachedEnergyThisTurn) {
      throw new Error("Already attached energy this turn");
    }

    const energyCardIndex = player.hand.findIndex(
      (card) => card.instanceId === action.payload.energyCardInstanceId,
    );
    if (energyCardIndex === -1) {
      throw new Error("Energy card not found in hand");
    }

    const energyCard = player.hand[energyCardIndex] as EnergyCardInGame;
    if (energyCard.baseCard.category !== CardCategory.Energy) {
      throw new Error("Selected card is not an Energy");
    }

    const targetPokemon = this.findPokemonOnBoard(
      action.playerId,
      action.payload.targetPokemonInstanceId,
    );
    if (!targetPokemon) {
      throw new Error("Target pokemon not found on the board");
    }

    player.hand.splice(energyCardIndex, 1);
    targetPokemon.attachedEnergies.push(energyCard);
    player.hasAttachedEnergyThisTurn = true;

    events.push({
      type: "ENERGY_ATTACHED",
      playerId: action.playerId,
      targetInstanceId: targetPokemon.instanceId,
      energyInstanceId: action.payload.energyCardInstanceId,
    });
  }

  private playTrainer(action: PlayTrainerAction, events: any[]) {
    const player = this.state.players[action.playerId];
    const trainerCardIndex = player.hand.findIndex(
      (card) => card.instanceId === action.payload.trainerCardInstanceId,
    );
    if (trainerCardIndex === -1) {
      throw new Error("Trainer card not found in hand");
    }

    const trainerCard = player.hand[trainerCardIndex] as TrainerCardInGame;
    if (trainerCard.baseCard.category !== CardCategory.Trainer) {
      throw new Error("Selected card is not a Trainer");
    }

    if (
      trainerCard.baseCard.trainerType === "Supporter" &&
      player.hasPlayedSupporterThisTurn
    ) {
      throw new Error("Supporter already played this turn");
    }

    if (
      trainerCard.baseCard.trainerType === "Supporter" &&
      this.state.firstPlayerId === action.playerId &&
      (player.turnsTaken || 0) === 0
    ) {
      throw new Error(
        "The first player cannot play a Supporter on their first turn",
      );
    }

    if (trainerCard.baseCard.trainerType === "Supporter") {
      player.hasPlayedSupporterThisTurn = true;
    }

    if (trainerCard.baseCard.trainerType === "Stadium") {
      player.hand.splice(trainerCardIndex, 1);
      if (this.state.stadium) {
        this.state.players[this.state.stadium.ownerId].discard.push(
          this.state.stadium,
        );
      }
      this.state.stadium = trainerCard;
      events.push({
        type: "STADIUM_PLAYED",
        playerId: action.playerId,
        cardInstanceId: trainerCard.instanceId,
      });
      return;
    }

    if (
      !trainerCard.baseCard.playEffects ||
      trainerCard.baseCard.playEffects.length === 0
    ) {
      throw new Error("This trainer card is not supported online yet");
    }

    events.push({
      type: "TRAINER_PLAYED",
      playerId: action.playerId,
      cardInstanceId: trainerCard.instanceId,
      trainerType: trainerCard.baseCard.trainerType,
    });

    if (
      trainerCard.baseCard.targetStrategy === "OWN_POKEMON" ||
      trainerCard.baseCard.playEffects.some(
        (effect) =>
          "target" in effect &&
          effect.target === TargetType.SELECTED_OWN_POKEMON,
      )
    ) {
      const options = this.listOwnPokemonOptions(action.playerId);
      if (options.length === 0) {
        throw new Error("No valid Pokemon target is available");
      }

      this.state.pendingTrainerPlay = {
        playerId: action.playerId,
        trainerCardInstanceId: trainerCard.instanceId,
        effects: trainerCard.baseCard.playEffects,
      };
      this.state.pendingPrompt = this.buildPrompt({
        playerId: action.playerId,
        type: PromptType.ChooseTrainerTarget,
        title: "Choisissez le Pokemon cible",
        minSelections: 1,
        maxSelections: 1,
        allowPass: false,
        options,
      });
      return;
    }

    this.effectResolver.resolveEffects(
      trainerCard.baseCard.playEffects,
      action.playerId,
      events,
    );
    this.moveTrainerFromHandToDiscard(
      action.playerId,
      trainerCard.instanceId,
      events,
    );
    this.resolveKnockoutAfterAction(events);
  }

  private attack(action: AttackAction, events: any[]) {
    const player = this.state.players[action.playerId];
    const activePokemon = player.active;

    if (!activePokemon) {
      throw new Error("No active Pokemon to attack with");
    }

    if (
      this.state.firstPlayerId === action.playerId &&
      (player.turnsTaken || 0) === 0
    ) {
      throw new Error("The first player cannot attack on their first turn");
    }

    if (
      activePokemon.specialConditions.includes(SpecialCondition.Asleep) ||
      activePokemon.specialConditions.includes(SpecialCondition.Paralyzed)
    ) {
      throw new Error(
        "Active Pokemon cannot attack due to a special condition",
      );
    }

    const attack = activePokemon.baseCard.attacks[action.payload.attackIndex];
    if (!attack) {
      throw new Error("Attack not found");
    }

    if (!this.canPayAttackCost(activePokemon, attack.cost)) {
      throw new Error("Not enough energy attached");
    }

    events.push({
      type: "ATTACK_USED",
      playerId: action.playerId,
      attackerInstanceId: activePokemon.instanceId,
      attackName: attack.name,
    });

    const opponentId = this.getOpponentId(action.playerId);
    const opponentActive = this.state.players[opponentId].active;
    const attackDamage = this.calculateAttackDamage(
      activePokemon,
      opponentActive,
      attack,
    );

    if (opponentActive && attackDamage > 0) {
      opponentActive.damageCounters += attackDamage;
      events.push({
        type: "DAMAGE_DEALT",
        amount: attackDamage,
        targetInstanceId: opponentActive.instanceId,
      });
    }

    if (attack.effects && attack.effects.length > 0) {
      this.effectResolver.resolveEffects(
        attack.effects,
        action.playerId,
        events,
      );
    }

    this.resolveKnockoutAfterAction(events, "AFTER_ATTACK_PROMOTION");
    if (
      this.state.gamePhase === GamePhase.Finished ||
      this.state.pendingPrompt
    ) {
      return;
    }

    this.endTurn(events);
  }

  private evolvePokemon(action: EvolvePokemonAction, events: any[]) {
    const player = this.state.players[action.playerId];
    const cardIndex = player.hand.findIndex(
      (card) => card.instanceId === action.payload.evolutionCardInstanceId,
    );
    if (cardIndex === -1) {
      throw new Error("Evolution card not found in hand");
    }

    if ((player.turnsTaken || 0) === 0) {
      throw new Error("You cannot evolve Pokemon during your first turn");
    }

    const evolutionCard = player.hand[cardIndex] as PokemonCardInGame;
    if (evolutionCard.baseCard.category !== CardCategory.Pokemon) {
      throw new Error("Card is not a Pokemon");
    }

    if (evolutionCard.baseCard.stage === "De base") {
      throw new Error("Cannot evolve into a Basic Pokemon");
    }

    const targetPokemon = this.findPokemonOnBoard(
      action.playerId,
      action.payload.targetPokemonInstanceId,
    );
    if (!targetPokemon) {
      throw new Error("Target pokemon not found");
    }

    if (targetPokemon.turnsInPlay < 1) {
      throw new Error("Cannot evolve a Pokemon the same turn it was played");
    }

    if (
      evolutionCard.baseCard.evolvesFrom &&
      this.normalizeName(evolutionCard.baseCard.evolvesFrom) !==
        this.normalizeName(targetPokemon.baseCard.name)
    ) {
      throw new Error("This evolution card cannot evolve the selected Pokemon");
    }

    evolutionCard.damageCounters = targetPokemon.damageCounters;
    evolutionCard.attachedEnergies = targetPokemon.attachedEnergies;
    evolutionCard.attachedTools = targetPokemon.attachedTools;
    evolutionCard.specialConditions = [];
    evolutionCard.turnsInPlay = 0;
    evolutionCard.attachedEvolutions = [
      ...targetPokemon.attachedEvolutions,
      targetPokemon,
    ];

    player.hand.splice(cardIndex, 1);

    if (player.active?.instanceId === targetPokemon.instanceId) {
      player.active = evolutionCard;
    } else {
      const benchIndex = player.bench.findIndex(
        (pokemon) => pokemon.instanceId === targetPokemon.instanceId,
      );
      player.bench[benchIndex] = evolutionCard;
    }

    events.push({
      type: "POKEMON_EVOLVED",
      playerId: action.playerId,
      fromInstanceId: targetPokemon.instanceId,
      toInstanceId: evolutionCard.instanceId,
    });
  }

  private retreat(action: RetreatAction, events: any[]) {
    const player = this.state.players[action.playerId];
    const activePokemon = player.active;

    if (!activePokemon) {
      throw new Error("No active Pokemon to retreat");
    }

    if (player.hasRetreatedThisTurn) {
      throw new Error("Already retreated this turn");
    }

    if (
      activePokemon.specialConditions.includes(SpecialCondition.Asleep) ||
      activePokemon.specialConditions.includes(SpecialCondition.Paralyzed)
    ) {
      throw new Error(
        "Active Pokemon cannot retreat due to a special condition",
      );
    }

    const benchIndex = player.bench.findIndex(
      (pokemon) => pokemon.instanceId === action.payload.benchPokemonInstanceId,
    );
    if (benchIndex === -1) {
      throw new Error("Target bench Pokemon not found");
    }

    const retreatCost = activePokemon.baseCard.retreat || 0;
    const discardedIds = action.payload.discardedEnergyInstanceIds || [];

    if (discardedIds.length !== retreatCost) {
      throw new Error(
        `Retreat requires exactly ${retreatCost} energy to be discarded`,
      );
    }

    const discardedEnergy: EnergyCardInGame[] = [];
    const keptEnergy: EnergyCardInGame[] = [];
    for (const energy of activePokemon.attachedEnergies) {
      if (discardedIds.includes(energy.instanceId)) {
        discardedEnergy.push(energy);
      } else {
        keptEnergy.push(energy);
      }
    }

    if (discardedEnergy.length !== retreatCost) {
      throw new Error(
        "Selected energy cards are not attached to the active Pokemon",
      );
    }

    activePokemon.attachedEnergies = keptEnergy;
    player.discard.push(...discardedEnergy);

    const [newActive] = player.bench.splice(benchIndex, 1);
    player.bench.push(activePokemon);
    player.active = newActive;
    activePokemon.specialConditions = [];
    player.hasRetreatedThisTurn = true;

    events.push({
      type: "POKEMON_RETREATED",
      playerId: action.playerId,
      oldActiveInstanceId: activePokemon.instanceId,
      newActiveInstanceId: newActive.instanceId,
    });
  }

  private prepareOpeningHands(events: any[]) {
    if (!this.state.setup || this.state.setup.openingHandsReady) {
      return;
    }

    for (const playerId of this.state.playerIds) {
      const player = this.state.players[playerId];
      if (!player.deck.some((card) => this.isBasicPokemonCard(card))) {
        throw new Error(
          "A deck without a Basic Pokemon cannot start an online match",
        );
      }

      let mulliganCount = 0;
      player.hand = [];
      player.active = null;
      player.bench = [];
      player.prizes = [];

      while (true) {
        this.shufflePlayerDeck(playerId);
        player.hand = [];

        for (let drawIndex = 0; drawIndex < 7; drawIndex += 1) {
          const drawnCard = player.deck.pop();
          if (!drawnCard) {
            throw new Error(
              "Deck does not contain enough cards for opening hand",
            );
          }
          player.hand.push(drawnCard);
        }

        if (this.hasBasicPokemonInHand(playerId)) {
          break;
        }

        mulliganCount += 1;
        player.deck.push(...player.hand);
        player.hand = [];
        events.push({
          type: "MULLIGAN_DECLARED",
          playerId,
          count: mulliganCount,
        });
      }

      this.state.setup.mulliganCounts[playerId] = mulliganCount;
      this.state.players[playerId].mulliganCount = mulliganCount;
    }

    this.state.setup.openingHandsReady = true;
  }

  private resolveKnockoutAfterAction(
    events: any[],
    resumeActionOnPromotion?:
      | "AFTER_ATTACK_PROMOTION"
      | "AFTER_CHECKUP_PROMOTION",
  ) {
    for (const playerId of this.state.playerIds) {
      const activePokemon = this.state.players[playerId].active;
      if (!activePokemon) {
        continue;
      }

      if (activePokemon.damageCounters >= activePokemon.baseCard.hp) {
        this.knockOutActivePokemon(playerId, events, resumeActionOnPromotion);

        if (
          this.state.gamePhase === GamePhase.Finished ||
          this.state.pendingPrompt
        ) {
          return;
        }
      }
    }
  }

  private knockOutActivePokemon(
    playerId: string,
    events: any[],
    resumeActionOnPromotion?:
      | "AFTER_ATTACK_PROMOTION"
      | "AFTER_CHECKUP_PROMOTION",
  ) {
    const player = this.state.players[playerId];
    const knockedOutPokemon = player.active;

    if (!knockedOutPokemon) {
      return;
    }

    player.active = null;
    player.discard.push(
      ...knockedOutPokemon.attachedEvolutions,
      knockedOutPokemon,
      ...knockedOutPokemon.attachedTools,
      ...knockedOutPokemon.attachedEnergies,
    );

    events.push({
      type: "POKEMON_KNOCKED_OUT",
      playerId,
      targetInstanceId: knockedOutPokemon.instanceId,
    });

    const opponentId = this.getOpponentId(playerId);
    this.takePrizeCards(
      opponentId,
      knockedOutPokemon.baseCard.prizeCards || 1,
      events,
    );
    if (this.state.gamePhase === GamePhase.Finished) {
      return;
    }

    if (player.bench.length === 0) {
      this.finishGame(opponentId, GameFinishedReason.NoPokemon, events);
      return;
    }

    this.state.pendingPrompt = this.buildPrompt({
      playerId,
      type: PromptType.ChoosePromotion,
      title: "Choisissez le Pokemon a promouvoir",
      minSelections: 1,
      maxSelections: 1,
      allowPass: false,
      options: player.bench.map((pokemon) => ({
        value: pokemon.instanceId,
        label: pokemon.baseCard.name,
      })),
    });
    this.state.resumeAction = resumeActionOnPromotion || null;
  }

  private takePrizeCards(playerId: string, count: number, events: any[]) {
    const player = this.state.players[playerId];
    const takenCards: CardInGame[] = [];

    for (let index = 0; index < count; index += 1) {
      const prizeCard = player.prizes.pop();
      if (!prizeCard) {
        break;
      }
      takenCards.push(prizeCard);
      player.hand.push(prizeCard);
    }

    if (takenCards.length > 0) {
      player.prizeCardsTaken += takenCards.length;
      events.push({
        type: "PRIZE_CARDS_TAKEN",
        playerId,
        count: takenCards.length,
      });
    }

    if (player.prizes.length === 0) {
      this.finishGame(playerId, GameFinishedReason.PrizeOut, events);
    }
  }

  private finishGame(
    winnerId: string,
    reason: GameFinishedReason,
    events: any[],
  ) {
    this.state.gamePhase = GamePhase.Finished;
    this.state.turnStep = TurnStep.Main;
    this.state.winnerId = winnerId;
    this.state.winnerReason = reason;
    this.state.pendingPrompt = null;
    this.state.pendingTurnTransitionToPlayerId = null;
    this.state.pendingTrainerPlay = null;
    this.state.resumeAction = null;

    events.push({
      type: "GAME_OVER",
      winnerId,
      reason,
    });
  }

  private moveTrainerFromHandToDiscard(
    playerId: string,
    trainerCardInstanceId: string,
    events: any[],
  ) {
    const player = this.state.players[playerId];
    const trainerCardIndex = player.hand.findIndex(
      (card) => card.instanceId === trainerCardInstanceId,
    );

    if (trainerCardIndex === -1) {
      return;
    }

    const [trainerCard] = player.hand.splice(trainerCardIndex, 1);
    player.discard.push(trainerCard);
    events.push({
      type: "TRAINER_DISCARDED",
      playerId,
      cardInstanceId: trainerCard.instanceId,
    });
  }

  private findPokemonOnBoard(
    playerId: string,
    targetPokemonInstanceId: string,
  ): PokemonCardInGame | null {
    const player = this.state.players[playerId];
    if (player.active?.instanceId === targetPokemonInstanceId) {
      return player.active;
    }

    return (
      player.bench.find(
        (pokemon) => pokemon.instanceId === targetPokemonInstanceId,
      ) || null
    );
  }

  private takePokemonFromHand(
    playerId: string,
    cardInstanceId: string,
  ): PokemonCardInGame {
    const player = this.state.players[playerId];
    const cardIndex = player.hand.findIndex(
      (card) => card.instanceId === cardInstanceId,
    );
    if (cardIndex === -1) {
      throw new Error("Card not found in hand");
    }

    const card = player.hand[cardIndex];
    if (card.baseCard.category !== CardCategory.Pokemon) {
      throw new Error("Card is not a Pokemon");
    }

    player.hand.splice(cardIndex, 1);
    return this.initializePokemonRuntime(card as PokemonCardInGame);
  }

  private initializePokemonRuntime(card: PokemonCardInGame): PokemonCardInGame {
    return {
      ...card,
      damageCounters: card.damageCounters || 0,
      specialConditions: card.specialConditions || [],
      attachedEnergies: card.attachedEnergies || [],
      attachedTools: card.attachedTools || [],
      attachedEvolutions: card.attachedEvolutions || [],
      turnsInPlay: card.turnsInPlay || 0,
    };
  }

  private hasBasicPokemonInHand(playerId: string): boolean {
    return this.state.players[playerId].hand.some((card) =>
      this.isBasicPokemonCard(card),
    );
  }

  private listOwnPokemonOptions(playerId: string): PromptOption[] {
    const player = this.state.players[playerId];
    const options: PromptOption[] = [];

    if (player.active) {
      options.push({
        value: player.active.instanceId,
        label: `${player.active.baseCard.name} (Actif)`,
      });
    }

    for (const pokemon of player.bench) {
      options.push({
        value: pokemon.instanceId,
        label: `${pokemon.baseCard.name} (Banc)`,
      });
    }

    return options;
  }

  private serializePokemon(pokemon: PokemonCardInGame | null) {
    if (!pokemon) {
      return null;
    }

    return {
      instanceId: pokemon.instanceId,
      name: pokemon.baseCard.name,
      image: pokemon.baseCard.image,
      hp: pokemon.baseCard.hp,
      damageCounters: pokemon.damageCounters,
      types: pokemon.baseCard.types,
      stage: pokemon.baseCard.stage,
      suffix: pokemon.baseCard.suffix,
      specialConditions: pokemon.specialConditions,
      attachedEnergyCount: pokemon.attachedEnergies.length,
      attachedEnergies: pokemon.attachedEnergies.map((energy) => ({
        instanceId: energy.instanceId,
        name: energy.baseCard.name,
        provides: energy.baseCard.provides,
        isSpecial: Boolean(energy.baseCard.isSpecial),
      })),
      attacks: pokemon.baseCard.attacks.map((attack) => ({
        name: attack.name,
        cost: attack.cost,
        damage: attack.damage,
        effect: attack.effect,
      })),
      retreat: pokemon.baseCard.retreat,
    };
  }

  private serializeHandCard(card: CardInGame) {
    return {
      instanceId: card.instanceId,
      name: card.baseCard.name,
      category: card.baseCard.category,
      stage:
        card.baseCard.category === CardCategory.Pokemon
          ? (card.baseCard as PokemonCardInGame["baseCard"]).stage
          : undefined,
      image: card.baseCard.image,
      trainerType:
        card.baseCard.category === CardCategory.Trainer
          ? (card.baseCard as TrainerCardInGame["baseCard"]).trainerType
          : undefined,
      energyType:
        card.baseCard.category === CardCategory.Energy
          ? (card.baseCard as EnergyCardInGame["baseCard"]).energyType
          : undefined,
    };
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

  private calculateAttackDamage(
    attacker: PokemonCardInGame,
    defender: PokemonCardInGame | null,
    attack: Attack,
  ): number {
    let damage = this.parseDamageValue(attack.damage);

    if (!defender || damage <= 0) {
      return damage;
    }

    const attackerTypes = attacker.baseCard.types || [];
    const weakness = defender.baseCard.weaknesses?.find((entry) =>
      attackerTypes.includes(entry.type),
    );
    const resistance =
      attack.ignoreResistance === true
        ? undefined
        : defender.baseCard.resistances?.find((entry) =>
            attackerTypes.includes(entry.type),
          );

    if (weakness?.value) {
      if (
        weakness.value.startsWith("x") ||
        weakness.value.startsWith("X") ||
        weakness.value.startsWith("×")
      ) {
        damage *= Number(weakness.value.replace(/\D/g, "")) || 2;
      } else if (weakness.value.startsWith("+")) {
        damage += this.parseDamageValue(weakness.value);
      }
    }

    if (resistance?.value) {
      damage -= this.parseDamageValue(resistance.value);
    }

    return Math.max(0, damage);
  }

  private canPayAttackCost(
    pokemon: PokemonCardInGame,
    requiredCost: string[],
  ): boolean {
    if (requiredCost.length === 0) {
      return true;
    }

    const remainingEnergies = pokemon.attachedEnergies.map((energy) => ({
      instanceId: energy.instanceId,
      provides: energy.baseCard?.provides || ["Incolore"],
    }));

    const specificCosts = requiredCost.filter(
      (cost) => cost !== "Incolore" && cost !== "Colorless",
    );
    const colorlessCost = requiredCost.length - specificCosts.length;

    for (const specificCost of specificCosts) {
      const energyIndex = remainingEnergies.findIndex((energy) =>
        energy.provides.includes(specificCost),
      );
      if (energyIndex === -1) {
        return false;
      }
      remainingEnergies.splice(energyIndex, 1);
    }

    return remainingEnergies.length >= colorlessCost;
  }

  private incrementTurnsInPlay(playerId: string) {
    const player = this.state.players[playerId];
    if (player.active) {
      player.active.turnsInPlay += 1;
    }
    for (const pokemon of player.bench) {
      pokemon.turnsInPlay += 1;
    }
  }

  private resetTurnFlags(playerId: string) {
    const player = this.state.players[playerId];
    player.hasAttachedEnergyThisTurn = false;
    player.hasPlayedSupporterThisTurn = false;
    player.hasRetreatedThisTurn = false;
  }

  private shufflePlayerDeck(playerId: string) {
    const deck = this.state.players[playerId].deck;
    for (
      let currentIndex = deck.length - 1;
      currentIndex > 0;
      currentIndex -= 1
    ) {
      const randomIndex = Math.floor(this.nextRandom() * (currentIndex + 1));
      [deck[currentIndex], deck[randomIndex]] = [
        deck[randomIndex],
        deck[currentIndex],
      ];
    }
  }

  private buildPrompt(input: {
    playerId: string;
    type: PromptType;
    title: string;
    minSelections: number;
    maxSelections: number;
    allowPass: boolean;
    options: PromptOption[];
    metadata?: Record<string, unknown>;
  }): PendingPrompt {
    return {
      id: this.createPromptId(),
      playerId: input.playerId,
      type: input.type,
      title: input.title,
      minSelections: input.minSelections,
      maxSelections: input.maxSelections,
      allowPass: input.allowPass,
      options: input.options,
      metadata: input.metadata,
    };
  }

  private createPromptId(): string {
    return `prompt-${this.state.id}-${Date.now()}-${Math.floor(this.nextRandom() * 100000)}`;
  }

  private createSetupTask(
    type: SetupTaskType,
    playerId?: string,
    metadata?: Record<string, unknown>,
  ): SetupTask {
    return {
      id: `setup-${type}-${playerId || "system"}-${Math.floor(this.nextRandom() * 100000)}`,
      type,
      playerId,
      metadata,
    };
  }

  private getOpponentId(playerId: string): string {
    const opponentId = this.state.playerIds.find((id) => id !== playerId);
    if (!opponentId) {
      throw new Error("Opponent not found");
    }
    return opponentId;
  }

  private isBasicPokemonCard(card: CardInGame): boolean {
    return (
      card.baseCard.category === CardCategory.Pokemon &&
      (card as PokemonCardInGame).baseCard.stage === "De base"
    );
  }

  private normalizeName(value?: string): string {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }
}
