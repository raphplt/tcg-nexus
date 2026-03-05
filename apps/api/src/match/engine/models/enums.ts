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
