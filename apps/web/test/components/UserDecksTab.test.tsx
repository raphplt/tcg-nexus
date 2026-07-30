import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDecksTab } from "@/app/(main)/users/[id]/_components/UserDecksTab";
import { decksService } from "@/services/decks.service";

vi.mock("@/services/decks.service", () => ({
  decksService: {
    getPublicDecksByUser: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("UserDecksTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when user has no public decks", async () => {
    (decksService.getPublicDecksByUser as any).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    renderWithClient(<UserDecksTab userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("Aucun deck public")).toBeInTheDocument();
    });
  });

  it("shows error state on query failure", async () => {
    (decksService.getPublicDecksByUser as any).mockRejectedValue(
      new Error("boom"),
    );
    renderWithClient(<UserDecksTab userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    });
  });

  it("renders public decks with name and format type", async () => {
    (decksService.getPublicDecksByUser as any).mockResolvedValue({
      items: [
        {
          id: 1,
          name: "Blaze Deck",
          format: { id: 10, type: "Standard" },
          cards: [],
        },
        {
          id: 2,
          name: "Aqua Deck",
          format: { id: 11, type: "Extended" },
          cards: [],
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    });
    renderWithClient(<UserDecksTab userId={5} />);
    await waitFor(() => {
      expect(screen.getByText("Blaze Deck")).toBeInTheDocument();
    });
    expect(screen.getByText("Aqua Deck")).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("Extended")).toBeInTheDocument();
  });
});
