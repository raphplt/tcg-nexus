import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FaqPage from "@/app/[locale]/(main)/faq/page";
import messages from "@/messages/en.json";
import { faqService } from "@/services/faq.service";
import type { FaqItem } from "@/types/faq";

vi.unmock("next-intl");

vi.mock("@/services/faq.service", () => ({
  faqService: {
    getAll: vi.fn(),
  },
}));

describe("FaqPage (integration)", () => {
  const mockGetAll = vi.mocked(faqService.getAll);

  const sampleFaqs: FaqItem[] = [
    {
      id: 1,
      question: "How do I register for a tournament?",
      answer:
        "Navigate to the tournaments tab, select an open tournament, and click Register.",
      category: "Tournois",
      order: 1,
    },
    {
      id: 2,
      question: "How do payments work in the marketplace?",
      answer:
        "We support Stripe for secure card checkout and escrow protection.",
      category: "Marketplace",
      order: 2,
    },
    {
      id: 3,
      question: "Can I export my deck list?",
      answer:
        "Yes, you can export your deck to PTCGO or text format from your deck page.",
      category: "Decks",
      order: 3,
    },
  ];

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header, search bar, and category filter buttons", async () => {
    mockGetAll.mockResolvedValue(sampleFaqs);

    render(<FaqPage />, { wrapper: createWrapper() });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "FAQ & support",
    );
    expect(screen.getByText("Help centre")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Search a keyword/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tournois/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Marketplace/i }),
    ).toBeInTheDocument();
  });

  it("renders categorized questions and expands answer when clicked", async () => {
    mockGetAll.mockResolvedValue(sampleFaqs);

    render(<FaqPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("How do I register for a tournament?"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("How do payments work in the marketplace?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Can I export my deck list?")).toBeInTheDocument();

    const trigger = screen.getByText("How do I register for a tournament?");
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Navigate to the tournaments tab, select an open tournament, and click Register.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("filters questions when clicking category filter button", async () => {
    mockGetAll.mockResolvedValue(sampleFaqs);

    render(<FaqPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("How do I register for a tournament?"),
      ).toBeInTheDocument();
    });

    const tournamentCategoryButton = screen.getByRole("button", {
      name: /Tournois/i,
    });
    fireEvent.click(tournamentCategoryButton);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: "Tournois" }),
      );
    });
  });

  it("filters questions with debounce when user types into search input", async () => {
    mockGetAll.mockResolvedValue(sampleFaqs);

    render(<FaqPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("How do I register for a tournament?"),
      ).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search a keyword/i);
    fireEvent.change(searchInput, { target: { value: "tournament" } });

    await waitFor(
      () => {
        expect(mockGetAll).toHaveBeenCalledWith(
          expect.objectContaining({ search: "tournament" }),
        );
      },
      { timeout: 1500 },
    );
  });

  it("renders empty state message with contact support link when no questions match", async () => {
    mockGetAll.mockResolvedValue([]);

    render(<FaqPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("No answer matches your search."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Try other keywords or contact our team."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Contact support/i }),
    ).toBeInTheDocument();
  });

  it("renders error alert when FAQ query fails", async () => {
    mockGetAll.mockRejectedValue(new Error("Database error"));

    render(<FaqPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong while loading the FAQ."),
      ).toBeInTheDocument();
    });
  });
});
