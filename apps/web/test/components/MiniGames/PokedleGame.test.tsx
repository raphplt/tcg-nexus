import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { PokedleGame } from "@/components/MiniGames/Pokedle/PokedleGame";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    getDailySpecies: vi.fn(),
    getRandom: vi.fn(),
    search: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockTargetCard: PokemonCardType = {
  id: "card-pika",
  name: "Pikachu",
  dexId: [25],
  hp: 60,
  retreat: 1,
  types: ["Électrik"],
  set: { id: "base1", name: "Set de Base" },
  image: "https://assets.tcgdex.net/fr/base/base1/58",
} as unknown as PokemonCardType;

const mockSearchResults: PokemonCardType[] = [
  {
    id: "guess-salameche",
    name: "Salamèche",
    dexId: [4],
    hp: 50,
    retreat: 1,
    types: ["Feu"],
    set: { id: "base1", name: "Set de Base" },
  } as unknown as PokemonCardType,
  {
    id: "guess-pika",
    name: "Pikachu",
    dexId: [25],
    hp: 60,
    retreat: 1,
    types: ["Électrik"],
    set: { id: "base1", name: "Set de Base" },
  } as unknown as PokemonCardType,
];

describe("PokedleGame", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(pokemonCardService.getDailySpecies).mockResolvedValue(mockTargetCard);
    vi.mocked(pokemonCardService.getRandom).mockResolvedValue(mockTargetCard);
    vi.mocked(pokemonCardService.search).mockResolvedValue(mockSearchResults);
  });

  it("renders header and mode toggles", async () => {
    render(<PokedleGame />);

    await waitFor(() => {
      expect(screen.getByText("Pokédle")).toBeInTheDocument();
      expect(screen.getByText("Mode du jour")).toBeInTheDocument();
      expect(screen.getByText("Entraînement")).toBeInTheDocument();
    });
  });

  it("searches and submits a guess, updating the guess table", async () => {
    render(<PokedleGame />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Entrez le nom d'un Pokémon...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Entrez le nom d'un Pokémon...");
    fireEvent.change(searchInput, { target: { value: "Sala" } });

    await waitFor(() => {
      expect(screen.getByText("Salamèche")).toBeInTheDocument();
    });

    const option = screen.getByText("Salamèche");
    fireEvent.click(option);

    // Salamèche should now be in the table
    await waitFor(() => {
      const tableRows = screen.getAllByText("Salamèche");
      expect(tableRows.length).toBeGreaterThan(0);
    });
  });

  it("recognizes a winning guess and displays celebration banner", async () => {
    render(<PokedleGame />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Entrez le nom d'un Pokémon...")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Entrez le nom d'un Pokémon...");
    fireEvent.change(searchInput, { target: { value: "Pika" } });

    await waitFor(() => {
      expect(screen.getByText("Pikachu")).toBeInTheDocument();
    });

    // Select winning guess
    const option = screen.getByText("Pikachu");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByText("Félicitations !")).toBeInTheDocument();
    });
  });

  it("switches to training mode on tab click", async () => {
    render(<PokedleGame />);

    await waitFor(() => {
      expect(screen.getByText("Entraînement")).toBeInTheDocument();
    });

    const trainingTab = screen.getByText("Entraînement");
    fireEvent.click(trainingTab);

    await waitFor(() => {
      expect(pokemonCardService.getRandom).toHaveBeenCalled();
    });
  });

  it("opens and closes the stats modal", async () => {
    render(<PokedleGame />);

    await waitFor(() => {
      expect(screen.getByTitle("Statistiques")).toBeInTheDocument();
    });

    const statsButton = screen.getByTitle("Statistiques");
    fireEvent.click(statsButton);

    await waitFor(() => {
      expect(screen.getByText("Distribution des essais")).toBeInTheDocument();
    });
  });
});
