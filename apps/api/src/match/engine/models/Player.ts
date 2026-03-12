import { CardInGame, PokemonCardInGame } from './Card';

export interface PlayerState {
  playerId: string;
  name: string;
  
  // Zones
  deck: CardInGame[]; // Represents the ordered deck
  hand: CardInGame[];
  discard: CardInGame[];
  lostZone: CardInGame[];
  prizes: CardInGame[];
  
  // Board
  active: PokemonCardInGame | null;
  bench: PokemonCardInGame[]; // Up to 5 usually
  
  // Board State modifiers
  hasPlayedSupporterThisTurn: boolean;
  hasRetreatedThisTurn: boolean;
  hasAttachedEnergyThisTurn: boolean;
  prizeCardsTaken: number;
  mulliganCount?: number;
  turnsTaken?: number;
}
