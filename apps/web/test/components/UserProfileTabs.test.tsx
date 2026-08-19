import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserTournamentsTab } from "@/app/[locale]/(main)/users/[id]/_components/UserTournamentsTab";
import { UserDecksTab } from "@/app/[locale]/(main)/users/[id]/_components/UserDecksTab";
import { UserHeader } from "@/app/[locale]/(main)/users/[id]/_components/UserHeader";
import { playerService } from "@/services/player.service";
import { decksService } from "@/services/decks.service";
import { userFollowService } from "@/services/user-follow.service";
import { renderWithQueryClient } from "../test-utils";

vi.mock("@/services/player.service", () => ({
  playerService: {
    getTournamentHistory: vi.fn(),
  },
}));

vi.mock("@/services/decks.service", () => ({
  decksService: {
    getPublicDecksByUser: vi.fn(),
  },
}));

vi.mock("@/services/user-follow.service", () => ({
  userFollowService: {
    follow: vi.fn(),
    unfollow: vi.fn(),
  },
}));

const mockAuth = {
  user: { id: 1, email: "me@example.com" },
  isAuthenticated: true,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

describe("User Profile Components", () => {
  describe("UserTournamentsTab", () => {
    it("renders empty state when no playerId provided", () => {
      renderWithQueryClient(<UserTournamentsTab playerId={undefined} />);
      expect(screen.getByText("Aucun tournoi")).toBeInTheDocument();
    });

    it("renders tournament history list when loaded", async () => {
      vi.mocked(playerService.getTournamentHistory).mockResolvedValue({
        history: [
          {
            tournament: { id: "t-1", name: "Championship 2026" },
            wins: 3,
            losses: 1,
            draws: 0,
            rank: 1,
          },
        ],
      } as any);

      renderWithQueryClient(<UserTournamentsTab playerId={10} />);

      expect(
        await screen.findByText("Championship 2026"),
      ).toBeInTheDocument();
      expect(screen.getByText("4 match(s)")).toBeInTheDocument();
      expect(screen.getByText("1e place")).toBeInTheDocument();
    });
  });

  describe("UserDecksTab", () => {
    it("renders public decks list when available", async () => {
      vi.mocked(decksService.getPublicDecksByUser).mockResolvedValue({
        items: [
          {
            id: 1,
            name: "Pikachu Lightning",
            format: { type: "Standard" },
            cards: [],
          },
        ],
        total: 1,
      } as any);

      renderWithQueryClient(<UserDecksTab userId={10} />);

      expect(await screen.findByText("Pikachu Lightning")).toBeInTheDocument();
      expect(screen.getByText("Standard")).toBeInTheDocument();
    });
  });

  describe("UserHeader", () => {
    const mockUser: any = {
      id: 2,
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      createdAt: "2026-01-01T00:00:00Z",
      followersCount: 5,
      followingCount: 2,
      isFollowing: false,
      player: { elo: 1250 },
    };

    it("renders profile header and handles follow action", async () => {
      vi.mocked(userFollowService.follow).mockResolvedValue(undefined);

      renderWithQueryClient(<UserHeader user={mockUser} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("ELO 1250")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();

      const followBtn = screen.getByRole("button");
      fireEvent.click(followBtn);

      await waitFor(() => {
        expect(userFollowService.follow).toHaveBeenCalledWith(2);
      });
    });
  });
});
