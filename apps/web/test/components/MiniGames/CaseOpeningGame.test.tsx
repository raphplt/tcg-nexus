import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaseOpeningGame } from "@/components/MiniGames/CaseOpening/CaseOpeningGame";
import { miniGameService } from "@/services/miniGame.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { type BoosterCard, RarityTier } from "@/types/mini-game";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock("@/services/miniGame.service", () => ({
  miniGameService: { getCaseOpeningPacks: vi.fn() },
}));

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: { getAllSeries: vi.fn(), getAllSets: vi.fn() },
}));

vi.mock("@/hooks/useMiniGameSocket", () => ({
  useMiniGameSocket: () => ({
    connection: "idle",
    queue: "idle",
    error: null,
    selfId: null,
    opponent: null,
    session: null,
    reveal: null,
    opponentConnection: null,
    joinQueue: vi.fn(),
    leaveQueue: vi.fn(),
    ready: vi.fn(),
    submitGuess: vi.fn(),
    openPack: vi.fn(),
    reset: vi.fn(),
  }),
}));

// The roulette finishes instantly: framer-motion's completion callback fires
// right after mount.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, onAnimationComplete, ...props }: any) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, ...rest } = props;
      useEffect(() => {
        onAnimationComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const card = (id: string, name: string, trend: number, tier: RarityTier): BoosterCard =>
  ({
    id,
    name,
    rarityTier: tier,
    image: `https://assets.tcgdex.net/fr/sv/sv01/${id}`,
    set: { id: "sv01", name: "Écarlate et Violet" },
    pricing: { cardmarket: { trend } },
  }) as never;

const packs: BoosterCard[][][] = [
  [
    [card("1", "Pikachu", 0.5, RarityTier.Common), card("2", "Dracaufeu ex", 80, RarityTier.Secret)],
    [card("3", "Carapuce", 0.3, RarityTier.Common), card("4", "Miraidon", 4, RarityTier.Holo)],
  ],
];

const mockGetPacks = vi.mocked(miniGameService.getCaseOpeningPacks);

/**
 * Advances fake timers in small steps, each inside its own `act`, so React
 * renders between the reveal timers and the roulette can complete each card.
 */
const advance = async (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 250) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
  }
};

const renderGame = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CaseOpeningGame />
    </QueryClientProvider>,
  );

describe("CaseOpeningGame", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockGetPacks.mockReset();
    vi.mocked(pokemonCardService.getAllSeries).mockResolvedValue([
      { id: "sv", name: "Écarlate et Violet" },
    ]);
    vi.mocked(pokemonCardService.getAllSets).mockResolvedValue([
      { id: "sv01", name: "Écarlate et Violet", serie: { id: "sv", name: "EV" } } as never,
      { id: "swsh1", name: "Épée et Bouclier", serie: { id: "swsh", name: "EB" } } as never,
    ]);
  });

  it("requires a series before starting when the scope is a series", async () => {
    renderGame();
    expect(screen.getByText("Connexion requise")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Une série"));
    expect(screen.getByText("Jouer en solo").closest("button")).toBeDisabled();

    fireEvent.click(screen.getByText("Tout le catalogue"));
    expect(screen.getByText("Jouer en solo").closest("button")).not.toBeDisabled();
  });

  it("plays a local duel with the boosters drawn by the API", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetPacks.mockResolvedValue({
      style: "chase",
      composition: [],
      packs,
    });

    renderGame();
    fireEvent.click(screen.getByText("Chasse"));
    fireEvent.click(screen.getByText("Jouer en local"));

    expect(mockGetPacks).toHaveBeenCalledWith({
      count: 3,
      players: 2,
      setId: undefined,
      serieId: undefined,
      style: "chase",
    });

    await waitFor(() =>
      expect(screen.getByText("Joueur 1 : ouvrir le booster 1")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Joueur 1 : ouvrir le booster 1"));

    // Two cards spin then land; the board then shows the booster value.
    await advance(3_000);
    expect(screen.getByText("Joueur 2 : ouvrir le booster 1")).toBeInTheDocument();
    expect(screen.getAllByText("Dracaufeu ex").length).toBeGreaterThan(0);
    expect(screen.getByText("Secrète")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Joueur 2 : ouvrir le booster 1"));
    await advance(3_000);

    expect(screen.getByText("Duel terminé !")).toBeInTheDocument();
    expect(screen.getByText("Victoire de Joueur 1 !")).toBeInTheDocument();
    expect(screen.getByText(/Meilleure pioche : Dracaufeu ex/)).toBeInTheDocument();
  });

  it("shows an explicit error when the scope holds no priced card", async () => {
    mockGetPacks.mockRejectedValueOnce(new Error("503"));
    renderGame();
    fireEvent.click(screen.getByText("Jouer en solo"));
    await waitFor(() =>
      expect(screen.getByText("Impossible de lancer la partie")).toBeInTheDocument(),
    );
  });
});
