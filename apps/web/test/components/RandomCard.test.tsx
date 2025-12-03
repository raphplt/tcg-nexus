import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RandomCard from "@/components/Home/RandomCard";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { renderWithQueryClient } from "../test-utils";
import type { PokemonCardType } from "@/types/cardPokemon";

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    getRandom: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 42,
      email: "user@test.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      role: "user",
      isPro: false,
      createdAt: new Date(),
    },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/components/Home/FavoritesButton", () => ({
  FavoriteButton: () => (
    <button aria-label="favorite-placeholder">Favori</button>
  ),
}));

const mockGetRandom = vi.mocked(pokemonCardService.getRandom);

const makeCard = (overrides: Partial<PokemonCardType>): PokemonCardType => ({
  id: "card-1",
  name: "Dracolosse",
  image: "/card.png",
  rarity: "Rare" as any,
  set: { id: "base", name: "Base" },
  hp: 120,
  types: ["Dragon"],
  ...overrides,
});

describe("RandomCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche une carte aléatoire après le chargement", async () => {
    mockGetRandom.mockResolvedValueOnce(makeCard({ name: "Lugia" }));

    renderWithQueryClient(<RandomCard userId={1} />);

    expect(screen.getByText(/Chargement/)).toBeInTheDocument();
    expect(await screen.findByText("Lugia")).toBeInTheDocument();
    expect(mockGetRandom).toHaveBeenCalledTimes(1);
  });

  it("rafraîchit la carte lorsqu'on demande une nouvelle carte", async () => {
    mockGetRandom
      .mockResolvedValueOnce(makeCard({ id: "card-1", name: "Arcanin" }))
      .mockResolvedValueOnce(makeCard({ id: "card-2", name: "Mewtwo" }));

    renderWithQueryClient(<RandomCard userId={1} />);
    await screen.findByText("Arcanin");

    await userEvent.click(
      screen.getByRole("button", { name: "Nouvelle carte" }),
    );

    await waitFor(() => expect(screen.getByText("Mewtwo")).toBeInTheDocument());
    expect(mockGetRandom).toHaveBeenCalledTimes(2);
  });

  it("affiche un message d'erreur si la requête échoue", async () => {
    mockGetRandom.mockRejectedValueOnce(new Error("fetch failed"));

    renderWithQueryClient(<RandomCard userId={1} />);

    await screen.findByText("Erreur lors du chargement de la carte");
  });
});
