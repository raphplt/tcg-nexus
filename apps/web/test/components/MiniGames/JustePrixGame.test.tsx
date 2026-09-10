import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JustePrixGame } from "@/components/MiniGames/JustePrix/JustePrixGame";
import { miniGameService } from "@/services/miniGame.service";
import type { JustePrixItem } from "@/types/mini-game";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock("@/services/miniGame.service", () => ({
  miniGameService: { getJustePrixItems: vi.fn() },
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

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const items: JustePrixItem[] = [
  {
    type: "card",
    id: "c1",
    price: 50,
    data: {
      id: "c1",
      name: "Dracaufeu",
      image: "https://assets.tcgdex.net/fr/base/base1/4",
      set: { id: "base1", name: "Set de Base" },
    } as never,
  },
  {
    type: "sealed",
    id: "etb-1",
    price: 40,
    data: {
      id: "etb-1",
      name: "ETB Évolutions",
      productType: "etb",
      pokemonSet: { id: "xy12", name: "Évolutions" },
    } as never,
  },
];

const mockGetItems = vi.mocked(miniGameService.getJustePrixItems);

const typeGuess = (value: string) => {
  const input = screen.getByPlaceholderText("Ton estimation en € (ex. 12,50)");
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
};

describe("JustePrixGame (solo flow)", () => {
  beforeEach(() => {
    mockGetItems.mockReset();
  });

  it("plays a full solo game from the API items, with hints and a recap", async () => {
    mockGetItems.mockResolvedValue({
      rules: { roundSeconds: 20, maxAccuracyPoints: 1000, maxSpeedBonus: 300 },
      items,
    });

    render(<JustePrixGame />);
    expect(screen.getByText("Connexion requise")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Jouer en solo"));
    expect(mockGetItems).toHaveBeenCalledWith(5);

    await waitFor(() => expect(screen.getByText("Dracaufeu")).toBeInTheDocument());
    expect(screen.getByText("Manche 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Carte de collection")).toBeInTheDocument();

    typeGuess("abc");
    expect(
      screen.getByText("Saisis un montant positif, par exemple 12,50."),
    ).toBeInTheDocument();

    typeGuess("10");
    expect(screen.getByText("C'est plus !")).toBeInTheDocument();

    typeGuess("48,5");
    expect(screen.getByText("Bravo !")).toBeInTheDocument();
    expect(screen.getByText("85 pts")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Manche suivante"));
    expect(screen.getByText("ETB Évolutions")).toBeInTheDocument();
    expect(screen.getByText("Produit scellé")).toBeInTheDocument();

    for (let i = 0; i < 5; i += 1) typeGuess("1");
    expect(screen.getByText("Manche ratée !")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Voir le récapitulatif"));
    expect(screen.getByText("Partie terminée !")).toBeInTheDocument();
    expect(screen.getByText("Score final : 85 points")).toBeInTheDocument();
    expect(screen.getByText(/non trouvé/)).toBeInTheDocument();
  });

  it("shows an explicit error with a retry instead of mock data", async () => {
    mockGetItems.mockRejectedValueOnce(new Error("503"));
    mockGetItems.mockResolvedValueOnce({
      rules: { roundSeconds: 20, maxAccuracyPoints: 1000, maxSpeedBonus: 300 },
      items,
    });

    render(<JustePrixGame />);
    fireEvent.click(screen.getByText("Jouer en local"));

    await waitFor(() =>
      expect(screen.getByText("Impossible de lancer la partie")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Dracaufeu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Réessayer"));
    await waitFor(() => expect(screen.getByText("Dracaufeu")).toBeInTheDocument());
    expect(screen.getByText("Au tour de Joueur 1")).toBeInTheDocument();
  });
});
