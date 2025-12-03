import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FavoriteButton } from "@/components/Home/FavoritesButton";
import { useAuth } from "@/contexts/AuthContext";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { cardEventTracker } from "@/services/card-event-tracker.service";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/auth";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/pokemonCard.service", () => ({
  pokemonCardService: {
    addToFavorites: vi.fn(),
  },
}));

vi.mock("@/services/card-event-tracker.service", () => ({
  cardEventTracker: {
    trackFavorite: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: toastMocks.success,
    error: toastMocks.error,
  },
  success: toastMocks.success,
  error: toastMocks.error,
}));

const mockUseAuth = vi.mocked(useAuth);
const mockAddToFavorites = vi.mocked(pokemonCardService.addToFavorites);
const mockTrackFavorite = vi.mocked(cardEventTracker.trackFavorite);

const authenticatedUser = {
  user: {
    id: 7,
    email: "misty@cerulean.com",
    firstName: "Misty",
    lastName: "Waterflower",
    avatarUrl: "",
    role: UserRole.USER as const,
    isPro: false,
    createdAt: new Date(),
  },
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
};

describe("FavoriteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authenticatedUser);
    mockAddToFavorites.mockResolvedValue({} as any);
    mockTrackFavorite.mockResolvedValue();
  });

  it("redirige vers la connexion si aucun utilisateur n'est connecté", async () => {
    mockUseAuth.mockReturnValue({
      ...authenticatedUser,
      user: null,
      isAuthenticated: false,
    });

    render(<FavoriteButton cardId="card-123" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter aux favoris" }),
    );

    const router = useRouter();
    expect(router.push).toHaveBeenCalledWith("/auth/login");
    expect(mockAddToFavorites).not.toHaveBeenCalled();
  });

  it("ajoute la carte aux favoris et affiche une confirmation", async () => {
    render(<FavoriteButton cardId="card-999" />);

    const trigger = screen.getByRole("button", {
      name: "Ajouter aux favoris",
    });
    await userEvent.click(trigger);

    await waitFor(() =>
      expect(mockAddToFavorites).toHaveBeenCalledWith(7, "card-999"),
    );
    expect(mockTrackFavorite).toHaveBeenCalledWith("card-999");
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Carte ajoutée aux favoris !",
    );

    const icon = trigger.querySelector("svg");
    expect(icon).toBeTruthy();
    await waitFor(() =>
      expect(icon).toHaveClass("fill-yellow-400", { exact: false }),
    );
  });

  it("notifie l'utilisateur en cas d'erreur lors de l'ajout", async () => {
    mockAddToFavorites.mockRejectedValueOnce(new Error("nope"));

    render(<FavoriteButton cardId="card-1" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Ajouter aux favoris" }),
    );

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalled());
    expect(mockTrackFavorite).not.toHaveBeenCalled();
  });
});
