export enum CardCategory {
  Pokemon = "Pokémon",
  Trainer = "Dresseur",
  Energy = "Énergie",
}

export enum PokemonType {
  Grass = "Plante",
  Fire = "Feu",
  Water = "Eau",
  Lightning = "Électrique",
  Psychic = "Psy",
  Fighting = "Combat",
  Darkness = "Obscurité",
  Metal = "Métal",
  Fairy = "Fée",
  Dragon = "Dragon",
  Colorless = "Incolore",
}

export enum SpecialCondition {
  Asleep = "Asleep",
  Burned = "Burned",
  Confused = "Confused",
  Paralyzed = "Paralyzed",
  Poisoned = "Poisoned",
}

export enum GamePhase {
  Setup = "Setup",
  Play = "Play", // Main turns happening
  Finished = "Finished",
}

export enum TurnStep {
  Draw = "Draw",
  Main = "Main",
  PokemonCheckup = "PokemonCheckup",
}

export enum PlayerId {
  Player1 = "Player1",
  Player2 = "Player2",
}

export enum PromptType {
  // Setup prompts
  ChooseFirstPlayer = "CHOOSE_FIRST_PLAYER",
  ChooseActive = "CHOOSE_ACTIVE",
  ChooseBench = "CHOOSE_BENCH",
  ChooseMulliganDraw = "CHOOSE_MULLIGAN_DRAW",

  // Runtime prompts
  ChoosePromotion = "CHOOSE_PROMOTION",
  ChooseTrainerTarget = "CHOOSE_TRAINER_TARGET",

  // Effect-driven prompts (Phase 1 — effect parser support)
  ChooseCardFromHand = "CHOOSE_CARD_FROM_HAND",
  ChooseCardFromDeck = "CHOOSE_CARD_FROM_DECK",
  ChooseCardFromDiscard = "CHOOSE_CARD_FROM_DISCARD",
  ChooseBenchTarget = "CHOOSE_BENCH_TARGET",
  ChooseOpponentBenchTarget = "CHOOSE_OPPONENT_BENCH_TARGET",
  ChooseAttackToCopy = "CHOOSE_ATTACK_TO_COPY",
  ChooseEnergyToMove = "CHOOSE_ENERGY_TO_MOVE",
  ChooseEnergyToDiscard = "CHOOSE_ENERGY_TO_DISCARD",
  ReorderCards = "REORDER_CARDS",
}

export enum GameFinishedReason {
  PrizeOut = "PRIZE_OUT",
  DeckOut = "DECK_OUT",
  NoPokemon = "NO_POKEMON",
  Forfeit = "FORFEIT",
}
