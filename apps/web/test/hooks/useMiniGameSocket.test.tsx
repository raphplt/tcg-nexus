import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMiniGameSocket } from "@/hooks/useMiniGameSocket";
import type { MiniGameSessionState } from "@/types/mini-game";

type Handler = (...args: any[]) => void;

class FakeSocket {
  connected = false;
  handlers = new Map<string, Handler[]>();
  emit = vi.fn();
  disconnect = vi.fn(() => {
    this.connected = false;
  });
  removeAllListeners = vi.fn(() => this.handlers.clear());

  on(event: string, handler: Handler) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }

  fire(event: string, payload?: unknown) {
    if (event === "connect") this.connected = true;
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }
}

const sockets: FakeSocket[] = [];
const io = vi.fn((..._args: unknown[]) => {
  const socket = new FakeSocket();
  sockets.push(socket);
  return socket;
});

vi.mock("socket.io-client", () => ({ io: (...args: unknown[]) => io(...args) }));
vi.mock("@/utils/socket", () => ({ getSocketBaseUrl: () => "http://api.test" }));

const session = (
  overrides: Partial<MiniGameSessionState> = {},
): MiniGameSessionState => ({
  id: "s1",
  gameType: "juste_prix",
  round: 1,
  maxRounds: 3,
  state: "playing",
  roundStartedAt: 1000,
  roundDurationMs: 20000,
  serverTime: 1000,
  forfeitedBy: null,
  players: [],
  currentItem: null,
  ...overrides,
});

describe("useMiniGameSocket", () => {
  beforeEach(() => {
    sockets.length = 0;
    io.mockClear();
  });

  it("stays idle and opens no socket while disabled", () => {
    const { result } = renderHook(() => useMiniGameSocket("juste_prix", false));
    expect(result.current.connection).toBe("idle");
    expect(io).not.toHaveBeenCalled();
  });

  it("connects to the mini-game namespace and queues with the game type", () => {
    const { result } = renderHook(() => useMiniGameSocket("juste_prix", true));
    expect(io).toHaveBeenCalledWith(
      "http://api.test/mini-game",
      expect.objectContaining({ withCredentials: true }),
    );
    expect(result.current.connection).toBe("connecting");

    act(() => sockets[0]!.fire("connect"));
    expect(result.current.connection).toBe("connected");

    act(() => result.current.joinQueue({ roundCount: 3 }));
    expect(sockets[0]!.emit).toHaveBeenCalledWith("minigame_join_queue", {
      gameType: "juste_prix",
      params: { roundCount: 3 },
    });
    expect(result.current.queue).toBe("queued");
  });

  it("reports an unauthenticated visitor instead of spinning forever", () => {
    const { result } = renderHook(() => useMiniGameSocket("juste_prix", true));
    act(() => sockets[0]!.fire("connect"));
    act(() => sockets[0]!.fire("disconnect", "io server disconnect"));
    expect(result.current.connection).toBe("unauthorized");
    expect(result.current.error).toBe("unauthorized");
  });

  it("joins the room when matched and follows the session", () => {
    const { result } = renderHook(() => useMiniGameSocket("juste_prix", true));
    const socket = sockets[0]!;
    act(() => socket.fire("connect"));
    act(() =>
      socket.fire("minigame_matched", {
        sessionId: "s1",
        gameType: "juste_prix",
        selfId: 7,
        opponentId: 9,
        opponentName: "misty",
        roundCount: 3,
      }),
    );

    expect(socket.emit).toHaveBeenCalledWith("minigame_join_room", {
      sessionId: "s1",
    });
    expect(result.current.queue).toBe("matched");
    expect(result.current.selfId).toBe(7);
    expect(result.current.opponent).toEqual({ id: 9, name: "misty" });

    act(() => socket.fire("minigame_state_update", session({ state: "waiting", round: 0 })));
    expect(result.current.session?.state).toBe("waiting");

    act(() => result.current.ready());
    act(() => result.current.submitGuess(12.5));
    expect(socket.emit).toHaveBeenCalledWith("minigame_ready", { sessionId: "s1" });
    expect(socket.emit).toHaveBeenCalledWith("minigame_submit_guess", {
      sessionId: "s1",
      guess: 12.5,
    });
  });

  it("keeps the reveal through the state update of the same round and drops it on the next round", () => {
    const { result } = renderHook(() => useMiniGameSocket("juste_prix", true));
    const socket = sockets[0]!;
    act(() => socket.fire("connect"));
    act(() => socket.fire("minigame_state_update", session({ round: 1 })));

    const reveal = { round: 1, correctPrice: 50, guesses: [] };
    act(() => socket.fire("minigame_round_reveal", reveal));
    expect(result.current.reveal).toEqual(reveal);

    // The server sends the closed-round state right around the reveal.
    act(() => socket.fire("minigame_state_update", session({ round: 1 })));
    expect(result.current.reveal).toEqual(reveal);

    act(() => socket.fire("minigame_state_update", session({ round: 2 })));
    expect(result.current.reveal).toBeNull();
  });

  it("surfaces catalog errors and opponent connection notices", () => {
    const { result } = renderHook(() => useMiniGameSocket("juste_prix", true));
    const socket = sockets[0]!;
    act(() => socket.fire("connect"));
    act(() => result.current.joinQueue());
    act(() => socket.fire("minigame_error", { code: "not_enough_items" }));
    expect(result.current.queue).toBe("idle");
    expect(result.current.error).toBe("not_enough_items");

    act(() =>
      socket.fire("minigame_matched", {
        sessionId: "s1",
        gameType: "juste_prix",
        selfId: 7,
        opponentId: 9,
        opponentName: "misty",
        roundCount: 3,
      }),
    );
    act(() =>
      socket.fire("minigame_player_connection", {
        userId: 9,
        userName: "misty",
        connected: false,
        graceMs: 20000,
      }),
    );
    expect(result.current.opponentConnection?.connected).toBe(false);

    // Our own reconnection notice is not about the opponent.
    act(() =>
      socket.fire("minigame_player_connection", {
        userId: 7,
        userName: "me",
        connected: true,
      }),
    );
    expect(result.current.opponentConnection?.userId).toBe(9);
  });

  it("disconnects when disabled again", () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useMiniGameSocket("juste_prix", enabled),
      { initialProps: { enabled: true } },
    );
    act(() => sockets[0]!.fire("connect"));
    rerender({ enabled: false });
    expect(sockets[0]!.disconnect).toHaveBeenCalled();
    expect(result.current.connection).toBe("idle");
  });
});
