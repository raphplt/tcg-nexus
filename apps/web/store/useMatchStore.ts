import {
  OnlineMatchLogEntry,
  OnlineMatchSessionView,
  SanitizedGameState,
} from "@/types/match-online";
import { create } from "zustand";

interface MatchStoreState {
  matchId: number | null;
  enginePlayerId: string | null;
  sessionView: OnlineMatchSessionView | null;
  gameState: SanitizedGameState | null;
  recentEvents: OnlineMatchLogEntry[];
  isConnected: boolean;
  lastError: string | null;
  setConnectionStatus: (status: boolean) => void;
  setSessionView: (sessionView: OnlineMatchSessionView | null) => void;
  setGameState: (gameState: SanitizedGameState | null) => void;
  appendRealtimeEvents: (events: Record<string, unknown>[]) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const initialState = {
  matchId: null,
  enginePlayerId: null,
  sessionView: null,
  gameState: null,
  recentEvents: [],
  isConnected: false,
  lastError: null,
};

export const useMatchStore = create<MatchStoreState>((set) => ({
  ...initialState,
  setConnectionStatus: (status) => set({ isConnected: status }),
  setSessionView: (sessionView) =>
    set({
      matchId: sessionView?.matchId ?? null,
      enginePlayerId: sessionView?.enginePlayerId ?? null,
      sessionView,
      gameState: sessionView?.gameState ?? null,
      recentEvents: sessionView?.recentLog ?? [],
    }),
  setGameState: (gameState) => set({ gameState }),
  appendRealtimeEvents: (events) =>
    set((state) => ({
      recentEvents: [
        ...state.recentEvents,
        ...events.map((payload, index) => ({
          id: `live-${Date.now()}-${index}`,
          kind: "EVENT" as const,
          timestamp: new Date().toISOString(),
          payload,
        })),
      ].slice(-100),
    })),
  setError: (message) => set({ lastError: message }),
  reset: () => set(initialState),
}));
