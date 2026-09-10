import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  JustePrixRoundReveal,
  MiniGameMatchedPayload,
  MiniGamePlayerConnectionPayload,
  MiniGameQueueParams,
  MiniGameSessionState,
  MiniGameType,
} from "@/types/mini-game";
import { getSocketBaseUrl } from "@/utils/socket";

/** Connection lifecycle of the mini-game socket. */
export type MiniGameConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "unauthorized"
  | "disconnected"
  | "error";

export type MiniGameQueueStatus = "idle" | "queued" | "matched";

/** Errors surfaced to the UI, as translation-friendly codes. */
export type MiniGameErrorCode =
  | "connection_failed"
  | "not_enough_items"
  | "unauthorized";

export interface MiniGameSocketState {
  connection: MiniGameConnectionStatus;
  queue: MiniGameQueueStatus;
  error: MiniGameErrorCode | null;
  selfId: number | null;
  opponent: { id: number; name: string } | null;
  session: MiniGameSessionState | null;
  /** Reveal of the current round, cleared when the next round starts. */
  reveal: JustePrixRoundReveal | null;
  /** Opponent connection notice during the reconnection grace period. */
  opponentConnection: MiniGamePlayerConnectionPayload | null;
}

export interface MiniGameSocketActions {
  joinQueue: (params?: MiniGameQueueParams) => void;
  leaveQueue: () => void;
  ready: () => void;
  submitGuess: (guess: number) => void;
  openPack: () => void;
  /** Leaves the queue and forgets the current session. */
  reset: () => void;
}

export type UseMiniGameSocket = MiniGameSocketState & MiniGameSocketActions;

const INITIAL_STATE: MiniGameSocketState = {
  connection: "idle",
  queue: "idle",
  error: null,
  selfId: null,
  opponent: null,
  session: null,
  reveal: null,
  opponentConnection: null,
};

/**
 * Socket client of the two-player mini-games.
 *
 * Opens one connection to the `/mini-game` namespace while `enabled`, handles
 * matchmaking and session events, and exposes the server state as-is: the
 * server is the authority on rounds, timers and scores. The hook never
 * invents state the server did not send.
 *
 * @param gameType Game to queue for.
 * @param enabled Whether the connection should be open.
 */
export function useMiniGameSocket(
  gameType: MiniGameType,
  enabled: boolean,
): UseMiniGameSocket {
  const [state, setState] = useState<MiniGameSocketState>(INITIAL_STATE);
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const matchedRef = useRef(false);
  const socketBaseUrl = useMemo(() => getSocketBaseUrl(), []);

  const patch = useCallback(
    (update: Partial<MiniGameSocketState>) =>
      setState((prev) => ({ ...prev, ...update })),
    [],
  );

  useEffect(() => {
    if (!enabled || !socketBaseUrl) {
      return;
    }

    setState({ ...INITIAL_STATE, connection: "connecting" });
    matchedRef.current = false;
    sessionIdRef.current = null;

    const socket = io(`${socketBaseUrl}/mini-game`, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => patch({ connection: "connected", error: null }));

    socket.on("connect_error", () =>
      patch({ connection: "error", error: "connection_failed" }),
    );

    socket.on("disconnect", (reason) => {
      // The gateway drops unauthenticated sockets right after the handshake.
      if (reason === "io server disconnect" && !matchedRef.current) {
        patch({
          connection: "unauthorized",
          error: "unauthorized",
          queue: "idle",
        });
        return;
      }
      patch({ connection: "disconnected", queue: "idle" });
    });

    socket.on("minigame_matched", (data: MiniGameMatchedPayload) => {
      matchedRef.current = true;
      sessionIdRef.current = data.sessionId;
      patch({
        queue: "matched",
        selfId: data.selfId,
        opponent: { id: data.opponentId, name: data.opponentName },
        session: null,
        reveal: null,
        opponentConnection: null,
        error: null,
      });
      socket.emit("minigame_join_room", { sessionId: data.sessionId });
    });

    socket.on("minigame_state_update", (session: MiniGameSessionState) => {
      setState((prev) => {
        // A reveal belongs to one round: drop it only once the next round
        // starts, never on the state update that accompanies the reveal.
        const keepReveal =
          prev.reveal !== null && prev.reveal.round === session.round;
        return {
          ...prev,
          session,
          reveal: keepReveal ? prev.reveal : null,
          opponentConnection:
            session.state === "finished" ? null : prev.opponentConnection,
        };
      });
    });

    socket.on("minigame_round_reveal", (reveal: JustePrixRoundReveal) =>
      patch({ reveal }),
    );

    socket.on(
      "minigame_player_connection",
      (payload: MiniGamePlayerConnectionPayload) =>
        setState((prev) =>
          payload.userId === prev.selfId
            ? prev
            : { ...prev, opponentConnection: payload },
        ),
    );

    socket.on("minigame_error", (payload: { code?: string }) =>
      patch({
        queue: "idle",
        error:
          payload?.code === "not_enough_items"
            ? "not_enough_items"
            : "connection_failed",
      }),
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setState(INITIAL_STATE);
    };
  }, [enabled, socketBaseUrl, patch]);

  const joinQueue = useCallback(
    (params?: MiniGameQueueParams) => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      patch({ queue: "queued", error: null });
      socket.emit("minigame_join_queue", { gameType, params });
    },
    [gameType, patch],
  );

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit("minigame_leave_queue");
    patch({ queue: "idle" });
  }, [patch]);

  const emitForSession = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      socketRef.current?.emit(event, { sessionId, ...payload });
    },
    [],
  );

  const ready = useCallback(
    () => emitForSession("minigame_ready"),
    [emitForSession],
  );
  const submitGuess = useCallback(
    (guess: number) => emitForSession("minigame_submit_guess", { guess }),
    [emitForSession],
  );
  const openPack = useCallback(
    () => emitForSession("minigame_open_pack"),
    [emitForSession],
  );

  const reset = useCallback(() => {
    socketRef.current?.emit("minigame_leave_queue");
    sessionIdRef.current = null;
    matchedRef.current = false;
    setState((prev) => ({
      ...INITIAL_STATE,
      connection: prev.connection,
    }));
  }, []);

  return {
    ...state,
    joinQueue,
    leaveQueue,
    ready,
    submitGuess,
    openPack,
    reset,
  };
}
