import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserHeader } from "@/app/(main)/users/[id]/_components/UserHeader";
import { userFollowService } from "@/services/user-follow.service";
import type { PublicUser } from "@/types/public-profile";

vi.mock("@/services/user-follow.service", () => ({
  userFollowService: {
    follow: vi.fn().mockResolvedValue(undefined),
    unfollow: vi.fn().mockResolvedValue(undefined),
  },
}));

let mockAuth: {
  user: { id: number } | null;
  isAuthenticated: boolean;
} = {
  user: null,
  isAuthenticated: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const baseUser: PublicUser = {
  id: 5,
  firstName: "Ash",
  lastName: "Ketchum",
  avatarUrl: null,
  createdAt: "2024-01-01T00:00:00Z",
  player: { id: 12, elo: 1500, level: 3, xp: 250 },
  followersCount: 10,
  followingCount: 2,
  isFollowing: false,
};

describe("UserHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = { user: null, isAuthenticated: false };
  });

  it("renders full name, ELO badge and counts", () => {
    renderWithClient(<UserHeader user={baseUser} />);
    expect(screen.getByText("Ash Ketchum")).toBeInTheDocument();
    expect(screen.getByText(/ELO 1500/)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("hides follow button for anonymous visitors", () => {
    renderWithClient(<UserHeader user={baseUser} />);
    expect(screen.queryByRole("button", { name: /suivre/i })).toBeNull();
  });

  it("hides follow button on own profile", () => {
    mockAuth = { user: { id: 5 }, isAuthenticated: true };
    renderWithClient(<UserHeader user={baseUser} />);
    expect(screen.queryByRole("button", { name: /suivre/i })).toBeNull();
  });

  it("shows Suivre button when authenticated and viewing someone else", () => {
    mockAuth = { user: { id: 99 }, isAuthenticated: true };
    renderWithClient(<UserHeader user={baseUser} />);
    expect(
      screen.getByRole("button", { name: /^Suivre$/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Ne plus suivre' when already following", () => {
    mockAuth = { user: { id: 99 }, isAuthenticated: true };
    renderWithClient(<UserHeader user={{ ...baseUser, isFollowing: true }} />);
    expect(
      screen.getByRole("button", { name: /ne plus suivre/i }),
    ).toBeInTheDocument();
  });

  it("calls followService.follow when clicking Suivre", async () => {
    mockAuth = { user: { id: 99 }, isAuthenticated: true };
    renderWithClient(<UserHeader user={baseUser} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Suivre$/i }));
    await waitFor(() => {
      expect(userFollowService.follow).toHaveBeenCalledWith(5);
    });
  });

  it("calls followService.unfollow when clicking Ne plus suivre", async () => {
    mockAuth = { user: { id: 99 }, isAuthenticated: true };
    renderWithClient(<UserHeader user={{ ...baseUser, isFollowing: true }} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /ne plus suivre/i }));
    await waitFor(() => {
      expect(userFollowService.unfollow).toHaveBeenCalledWith(5);
    });
  });
});
