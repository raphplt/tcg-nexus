import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhosThatPokemonGame } from "@/components/MiniGames/WhosThatPokemon/WhosThatPokemonGame";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    getRandomSpecies: vi.fn(),
    getRandom: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockSpecies = [
  { id: "1", tcgDexId: "p1", dexId: 25, name: "Pikachu", types: ["Lightning"] },
  { id: "2", tcgDexId: "p2", dexId: 6, name: "Dracaufeu", types: ["Fire"] },
  { id: "3", tcgDexId: "p3", dexId: 9, name: "Tortank", types: ["Water"] },
  { id: "4", tcgDexId: "p4", dexId: 3, name: "Florizarre", types: ["Grass"] },
  { id: "5", tcgDexId: "p5", dexId: 150, name: "Mewtwo", types: ["Psychic"] },
];

const mockCard: PokemonCardType = {
  id: "card-pika",
  name: "Pikachu",
  types: ["Lightning"],
  dexId: [25],
  set: { id: "base1", name: "Set de Base" },
  image: "https://assets.tcgdex.net/fr/base/base1/58",
} as never;

describe("WhosThatPokemonGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pokemonCardService.getRandomSpecies).mockResolvedValue(
      mockSpecies,
    );
    vi.mocked(pokemonCardService.getRandom).mockResolvedValue(mockCard);
  });

  it("renders difficulty selection options", () => {
    render(<WhosThatPokemonGame />);
    expect(screen.getByText("Facile")).toBeInTheDocument();
    expect(screen.getByText("Moyen")).toBeInTheDocument();
    expect(screen.getByText("Difficile")).toBeInTheDocument();
  });

  it("starts the game and presents 4 multiple-choice options including target", async () => {
    render(<WhosThatPokemonGame />);

    const playButtons = screen.getAllByText("Jouer");
    fireEvent.click(playButtons[0]!); // Easy

    await waitFor(() => {
      expect(screen.getByText("Pikachu")).toBeInTheDocument();
    });

    expect(pokemonCardService.getRandomSpecies).toHaveBeenCalledWith(40);
    expect(pokemonCardService.getRandom).toHaveBeenCalled();
  });

  it("shows success feedback and awards points when answering correctly", async () => {
    render(<WhosThatPokemonGame />);

    const playButtons = screen.getAllByText("Jouer");
    fireEvent.click(playButtons[0]!); // Easy

    await waitFor(() => {
      expect(screen.getByText("Pikachu")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pikachu" }));

    await waitFor(() => {
      expect(screen.getByText(/Bien joué/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Manche suivante")).toBeInTheDocument();
  });

  it("renders LoadError when drawing target card fails", async () => {
    vi.mocked(pokemonCardService.getRandom).mockResolvedValueOnce(null);

    render(<WhosThatPokemonGame />);

    const playButtons = screen.getAllByText("Jouer");
    fireEvent.click(playButtons[0]!);

    await waitFor(() => {
      expect(
        screen.getByText("Impossible de lancer la partie"),
      ).toBeInTheDocument();
    });
  });
});
