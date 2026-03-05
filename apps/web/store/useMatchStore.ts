import { create } from 'zustand';

// Assuming basic types that mimic the backend GameState
interface GameStateStore {
  matchId: string | null;
  playerId: string | null;
  gameState: any | null; // Will type properly later
  isConnected: boolean;
  
  setConnectionStatus: (status: boolean) => void;
  setMatchInfo: (matchId: string, playerId: string) => void;
  updateGameState: (state: any) => void;
}

export const useMatchStore = create<GameStateStore>((set) => ({
  matchId: null,
  playerId: null,
  gameState: null,
  isConnected: false,
  
  setConnectionStatus: (status) => set({ isConnected: status }),
  setMatchInfo: (matchId, playerId) => set({ matchId, playerId }),
  updateGameState: (state) => set({ gameState: state }),
}));
