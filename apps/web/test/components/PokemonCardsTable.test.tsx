import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PokemonCardsTable } from "@/components/PokemonCardsTable";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type { PokemonCardType } from "@/types/cardPokemon";
import type { PaginatedResult } from "@/types/pagination";
import { Rarity } from "@/types/listing";

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    getPaginated: vi.fn(),
    search: vi.fn(),
  },
}));

const sampleCards: PokemonCardType[] = [
  {
    id: "card-1",
    name: "Pikachu",
    image: "/pikachu",
    rarity: Rarity.RARE,
    set: { id: "base", name: "Base" },
    hp: 60,
    types: ["Electric"],
  },
  {
    id: "card-2",
    name: "Bulbasaur",
    image: "/bulbasaur",
    rarity: Rarity.COMMUNE,
    set: { id: "jungle", name: "Jungle" },
    hp: 50,
    types: ["Grass"],
  },
];

const createPaginated = (
  overrides?: Partial<PaginatedResult<PokemonCardType>["meta"]>,
): PaginatedResult<PokemonCardType> => ({
  data: sampleCards,
  meta: {
    totalItems: 20,
    itemCount: sampleCards.length,
    itemsPerPage: 10,
    totalPages: 2,
    currentPage: 1,
    hasNextPage: true,
    hasPreviousPage: false,
    ...overrides,
  },
});

const mockGetPaginated = vi.mocked(pokemonCardService.getPaginated);
const mockSearch = vi.mocked(pokemonCardService.search);

describe("PokemonCardsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPaginated.mockResolvedValue(createPaginated());
    mockSearch.mockResolvedValue([]);
  });

  it("affiche la pagination initiale et les cartes chargées", async () => {
    render(<PokemonCardsTable initialPage={1} itemsPerPage={10} />);

    expect(screen.getByText(/Chargement/)).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText(/Cartes Pokemon \(20 cartes\)/i),
      ).toBeInTheDocument(),
    );

    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText("Bulbasaur")).toBeInTheDocument();
    expect(screen.getByText(/Page 1 sur 2/)).toBeInTheDocument();
    expect(mockGetPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it("charge la page suivante et déclenche un nouvel appel API", async () => {
    mockGetPaginated
      .mockResolvedValueOnce(createPaginated())
      .mockResolvedValueOnce(
        createPaginated({
          currentPage: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        }),
      );

    render(<PokemonCardsTable itemsPerPage={10} />);

    await screen.findByText("Pikachu");

    const nextPage = screen.getByLabelText("Go to next page");
    await userEvent.click(nextPage);

    await waitFor(() =>
      expect(mockGetPaginated).toHaveBeenLastCalledWith({
        page: 2,
        limit: 10,
      }),
    );
    expect(screen.getByText(/Page 2 sur 2/)).toBeInTheDocument();
  });

  it("permet de rechercher puis de réinitialiser les résultats", async () => {
    const mewCard: PokemonCardType = {
      ...sampleCards[0]!,
      id: "card-3",
      name: "Mew",
      set: sampleCards[0]!.set,
    };

    mockSearch.mockResolvedValue([mewCard]);

    render(<PokemonCardsTable itemsPerPage={5} />);
    await screen.findByText("Pikachu");

    await userEvent.type(
      screen.getByPlaceholderText(/Rechercher une carte/),
      "Mew",
    );
    await userEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    await screen.findByText(/Résultats pour "Mew"/i);
    expect(mockSearch).toHaveBeenCalledWith("Mew");
    expect(screen.getByText("Mew")).toBeInTheDocument();

    const callsBeforeClear = mockGetPaginated.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Effacer" }));
    await waitFor(() =>
      expect(mockGetPaginated.mock.calls.length).toBeGreaterThan(
        callsBeforeClear,
      ),
    );
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
  });

  it("affiche un état d'erreur lorsque le chargement échoue", async () => {
    mockGetPaginated.mockRejectedValueOnce(new Error("network down"));

    render(<PokemonCardsTable />);

    await screen.findByText("Erreur lors du chargement des cartes Pokemon");
  });
});
