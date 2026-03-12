export enum ActionType {
  PLAY_POKEMON_TO_BENCH = 'PLAY_POKEMON_TO_BENCH',
  EVOLVE_POKEMON = 'EVOLVE_POKEMON',
  ATTACH_ENERGY = 'ATTACH_ENERGY',
  PLAY_TRAINER = 'PLAY_TRAINER',
  ATTACK = 'ATTACK',
  RETREAT = 'RETREAT',
  END_TURN = 'END_TURN',
  PASS = 'PASS', // e.g. when asked to do something optional
}

export interface PlayerAction {
  playerId: string;
  type: ActionType;
  payload?: any;
}

export interface PlayPokemonAction extends PlayerAction {
  type: ActionType.PLAY_POKEMON_TO_BENCH;
  payload: {
    cardInstanceId: string;
  };
}

export interface EvolvePokemonAction extends PlayerAction {
  type: ActionType.EVOLVE_POKEMON;
  payload: {
    evolutionCardInstanceId: string;
    targetPokemonInstanceId: string;
  };
}

export interface AttachEnergyAction extends PlayerAction {
  type: ActionType.ATTACH_ENERGY;
  payload: {
    energyCardInstanceId: string;
    targetPokemonInstanceId: string;
  };
}

export interface AttackAction extends PlayerAction {
  type: ActionType.ATTACK;
  payload: {
    attackIndex: number;
  };
}

export interface PlayTrainerAction extends PlayerAction {
  type: ActionType.PLAY_TRAINER;
  payload: {
    trainerCardInstanceId: string;
  };
}

export interface RetreatAction extends PlayerAction {
  type: ActionType.RETREAT;
  payload: {
    benchPokemonInstanceId: string;
    discardedEnergyInstanceIds: string[];
  };
}
