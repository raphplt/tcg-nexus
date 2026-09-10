import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyDecksPage from "@/app/[locale]/(main)/decks/me/page";
import { decksService } from "@/services/decks.service";
import { UserRole } from "@/types/auth";
import type { Deck } from "@/types/Decks";
import type { PaginatedResult } from "@/types/pagination";
import { authedFetch } from "@/utils/fetch";

const auth = vi.hoisted(() => ({
  user: { id: 7 },
  isAuthenticated: true,
  isLoading: false,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/services/decks.service", () => ({
  decksService: {
    getUserDecksPaginated: vi.fn(),
    getSavedDecksPaginated: vi.fn(),
    getSavedDeckIds: vi.fn(),
    incrementView: vi.fn(),
    removeDeck: vi.fn(),
    exportDeckJson: vi.fn(),
  },
}));
vi.mock("@/utils/fetch", () => ({ authedFetch: vi.fn() }));

const deck: Deck = {
  id: 42,
  name: "Gardevoir",
  isPublic: false,
  views: 8,
  cards: [],
  createdAt: new Date("2026-09-01"),
  user: {
    id: 7,
    avatarUrl: "",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    role: UserRole.USER,
    isPro: false,
    isActive: true,
    createdAt: new Date("2026-01-01"),
  },
  format: {
    id: 1,
    type: "Standard",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2027-01-01"),
  },
};

function result(data: Deck[], page = 1, totalPages = 1): PaginatedResult<Deck> {
  return {
    data,
    meta: {
      currentPage: page,
      totalPages,
      totalItems: data.length,
      itemCount: data.length,
      itemsPerPage: 12,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <NextIntlClientProvider locale="fr" timeZone="Europe/Paris" messages={{}}>
      <QueryClientProvider client={client}>
        <MyDecksPage />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return client;
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  auth.isAuthenticated = true;
  auth.isLoading = false;
  vi.mocked(decksService.getUserDecksPaginated)
    .mockReset()
    .mockResolvedValue(result([deck]));
  vi.mocked(decksService.removeDeck).mockReset();
  vi.mocked(authedFetch)
    .mockReset()
    .mockResolvedValue([
      deck.format,
      { ...deck.format, id: 2, type: "Expanded" },
    ]);
});

describe("personal deck library", () => {
  it("waits for authentication before requesting private data", () => {
    auth.isLoading = true;
    mount();
    expect(decksService.getUserDecksPaginated).not.toHaveBeenCalled();
    expect(authedFetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: "Se connecter" }),
    ).not.toBeInTheDocument();
  });

  it("offers sign-in without requesting private data when signed out", () => {
    auth.isAuthenticated = false;
    mount();
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    expect(decksService.getUserDecksPaginated).not.toHaveBeenCalled();
  });

  it("refetches on format changes and removes the format parameter for all formats", async () => {
    mount();
    await screen.findByText("Gardevoir");
    fireEvent.change(screen.getByRole("combobox", { name: "Format" }), {
      target: { value: "2" },
    });
    await waitFor(() =>
      expect(decksService.getUserDecksPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ formatId: 2, page: 1 }),
      ),
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Format" }), {
      target: { value: "" },
    });
    await waitFor(() =>
      expect(decksService.getUserDecksPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ formatId: undefined }),
      ),
    );
  });

  it("debounces name searches and applies explicit sort directions", async () => {
    mount();
    await screen.findByText("Gardevoir");
    const calls = vi.mocked(decksService.getUserDecksPaginated).mock.calls
      .length;
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Dracaufeu  " },
    });
    expect(decksService.getUserDecksPaginated).toHaveBeenCalledTimes(calls);
    await waitFor(() =>
      expect(decksService.getUserDecksPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "Dracaufeu", page: 1 }),
      ),
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Trier les decks" }),
      { target: { value: "nameAsc" } },
    );
    await waitFor(() =>
      expect(decksService.getUserDecksPaginated).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortBy: "name", sortOrder: "ASC" }),
      ),
    );
  });

  it("keeps a failed deletion visible and allows retrying the same deck", async () => {
    const user = userEvent.setup();
    vi.mocked(decksService.removeDeck)
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(undefined);
    const client = mount();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await screen.findByText("Gardevoir");
    await user.click(
      screen.getByRole("button", { name: "Actions pour Gardevoir" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Supprimer" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Gardevoir/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "La suppression a échoué",
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Gardevoir", hidden: true }),
    ).toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["my-decks"] });
  });

  it("appends the next page at the end of the list", async () => {
    const user = userEvent.setup();
    const charizard: Deck = { ...deck, id: 43, name: "Dracaufeu" };
    vi.mocked(decksService.getUserDecksPaginated).mockImplementation(
      async (params) =>
        params?.page === 2 ? result([charizard], 2, 2) : result([deck], 1, 2),
    );
    mount();
    await screen.findByText("Gardevoir");
    expect(screen.queryByRole("link", { name: "2" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Afficher plus" }));

    await screen.findByText("Dracaufeu");
    expect(screen.getByText("Gardevoir")).toBeInTheDocument();
    expect(decksService.getUserDecksPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(
      screen.queryByRole("button", { name: "Afficher plus" }),
    ).not.toBeInTheDocument();
  });

  it("distinguishes an empty library from no search results", async () => {
    vi.mocked(decksService.getUserDecksPaginated).mockResolvedValue(result([]));
    mount();
    await screen.findByRole("heading", {
      name: "Votre prochaine stratégie commence ici",
    });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "missing" },
    });
    await screen.findByRole("heading", { name: "Aucun deck ne correspond" });
    expect(
      screen.queryByRole("heading", {
        name: "Votre prochaine stratégie commence ici",
      }),
    ).not.toBeInTheDocument();
  });

  it("keeps edit and analysis links accessible in both layouts", async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText("Gardevoir");
    expect(screen.getByRole("link", { name: "Modifier" })).toHaveAttribute(
      "href",
      "/decks/42/update",
    );
    await user.click(screen.getByRole("button", { name: "Vue liste" }));
    expect(screen.getByRole("button", { name: "Vue liste" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("link", { name: "Analyser" })).toHaveAttribute(
      "href",
      "/decks/42/analysis",
    );
  });

  it("lists favorited public decks in the favorites tab", async () => {
    const user = userEvent.setup();
    const favorite: Deck = {
      ...deck,
      id: 99,
      name: "Lugia",
      isPublic: true,
      user: { ...deck.user!, id: 8 },
    };
    vi.mocked(decksService.getSavedDecksPaginated)
      .mockReset()
      .mockResolvedValue(result([favorite]));
    vi.mocked(decksService.getSavedDeckIds).mockResolvedValue([99]);
    mount();
    await screen.findByText("Gardevoir");
    expect(decksService.getSavedDecksPaginated).not.toHaveBeenCalled();
    await user.click(screen.getByRole("tab", { name: "Favoris" }));
    await screen.findByText("Lugia");
    expect(decksService.getSavedDecksPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        sortBy: "createdAt",
        sortOrder: "DESC",
      }),
    );
    expect(window.location.search).toBe("?tab=favorites");
    expect(
      await screen.findByRole("button", { name: "Retirer des favoris" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vue liste" }),
    ).not.toBeInTheDocument();
  });

  it("points to public decks when no deck is favorited", async () => {
    const user = userEvent.setup();
    vi.mocked(decksService.getSavedDecksPaginated)
      .mockReset()
      .mockResolvedValue(result([]));
    mount();
    await user.click(screen.getByRole("tab", { name: "Favoris" }));
    await screen.findByRole("heading", { name: "Aucun deck en favoris" });
    for (const link of screen.getAllByRole("link", {
      name: /Explorer les decks de la communauté/,
    })) {
      expect(link).toHaveAttribute("href", "/decks");
    }
  });
});
