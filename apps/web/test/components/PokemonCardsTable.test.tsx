import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PokemonCardsTable } from "@/components/PokemonCardsTable";
import { pokemonCardService } from "@/services/pokemonCard.service";
import type {
  PokemonCardType,
  PokemonSerieType,
  PokemonSetType,
} from "@/types/cardPokemon";
import { Rarity } from "@/types/listing";
import type { PaginatedResult } from "@/types/pagination";

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    getPaginated: vi.fn(),
    getAllSeries: vi.fn(),
    getAllSets: vi.fn(),
    getSetRarities: vi.fn(),
  },
}));

const sampleSeries: PokemonSerieType = {
  id: "scarlet-violet",
  name: "Écarlate et Violet",
};

const sampleSet: PokemonSetType = {
  id: "base",
  name: "Foudre Noire",
  serie: sampleSeries,
  cardCount: { total: 172, official: 172, reverse: 0, holo: 0, firstEd: 0 },
};

const sampleCards: PokemonCardType[] = [
  {
    id: "card-1",
    localId: "001",
    name: "Pikachu",
    image: "/pikachu",
    rarity: Rarity.RARE,
    set: sampleSet,
    hp: 60,
    types: ["Lightning"],
  },
  {
    id: "card-2",
    localId: "002",
    name: "Bulbasaur",
    image: "/bulbasaur",
    rarity: Rarity.COMMUNE,
    set: sampleSet,
    hp: 50,
    types: ["Grass"],
  },
];

const createPaginated = (
  cards = sampleCards,
): PaginatedResult<PokemonCardType> => ({
  data: cards,
  meta: {
    totalItems: cards.length,
    itemCount: cards.length,
    itemsPerPage: 12,
    totalPages: 1,
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

const mockGetPaginated = vi.mocked(pokemonCardService.getPaginated);
const mockGetAllSeries = vi.mocked(pokemonCardService.getAllSeries);
const mockGetAllSets = vi.mocked(pokemonCardService.getAllSets);
const mockGetSetRarities = vi.mocked(pokemonCardService.getSetRarities);

async function selectSampleSet() {
  await userEvent.click(
    await screen.findByRole("button", { name: /Écarlate et Violet/ }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: /Foudre Noire/ }),
  );
}

describe("PokemonCardsTable", () => {
  beforeEach(() => {
    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    vi.clearAllMocks();
    mockGetAllSeries.mockResolvedValue([sampleSeries]);
    mockGetAllSets.mockResolvedValue([sampleSet]);
    mockGetSetRarities.mockResolvedValue(["Rare", "Commune", "Double rare"]);
    mockGetPaginated.mockResolvedValue(createPaginated());
  });

  it("loads cards after an expansion is selected", async () => {
    render(<PokemonCardsTable itemsPerPage={12} />);

    await selectSampleSet();

    expect(await screen.findByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText("Bulbasaur")).toBeInTheDocument();
    expect(mockGetPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 12,
      setId: sampleSet.id,
    });
  });

  it("builds the rarity filter from the selected expansion", async () => {
    render(<PokemonCardsTable />);

    await selectSampleSet();

    expect(mockGetSetRarities).toHaveBeenCalledWith(sampleSet.id);
    const doubleRareFilter = await screen.findByRole("button", {
      name: "Double rare",
    });
    expect(doubleRareFilter.querySelector("img")).toHaveAttribute(
      "src",
      "/images/rareties/JCC-Double-Rare.png",
    );
    expect(screen.getByRole("button", { name: "Commune" })).toBeInTheDocument();

    await userEvent.click(doubleRareFilter);

    await waitFor(() =>
      expect(mockGetPaginated).toHaveBeenLastCalledWith({
        page: 1,
        limit: 12,
        setId: sampleSet.id,
        rarity: "Double rare",
      }),
    );
    expect(doubleRareFilter).toHaveAttribute("aria-pressed", "true");
  });

  it("searches through the paginated endpoint and clears the query", async () => {
    const mewCard: PokemonCardType = {
      ...sampleCards[0]!,
      id: "card-3",
      name: "Mew",
    };
    mockGetPaginated.mockResolvedValue(createPaginated([mewCard]));

    render(<PokemonCardsTable itemsPerPage={5} />);

    await userEvent.type(
      screen.getByPlaceholderText(/Rechercher une carte/),
      "Mew",
    );
    await userEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(await screen.findByText("Mew")).toBeInTheDocument();
    expect(mockGetPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 5,
      search: "Mew",
    });

    await userEvent.click(screen.getByRole("button", { name: "Effacer" }));
    await waitFor(() =>
      expect(screen.queryByText(/Résultats pour/)).not.toBeInTheDocument(),
    );
  });

  it("shows a card loading error after a failed search", async () => {
    mockGetPaginated.mockRejectedValueOnce(new Error("network down"));
    render(<PokemonCardsTable />);

    await userEvent.type(
      screen.getByPlaceholderText(/Rechercher une carte/),
      "Mew",
    );
    await userEvent.click(screen.getByRole("button", { name: "Rechercher" }));

    await screen.findByText("Erreur lors du chargement des cartes Pokémon");
  });
});
