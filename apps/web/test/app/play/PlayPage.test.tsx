import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayPage from "@/app/(main)/play/page";
import { useAuth } from "@/contexts/AuthContext";
import { casualMatchService } from "@/services/casual-match.service";
import { matchService } from "@/services/match.service";
import { trainingMatchService } from "@/services/training-match.service";
import { navigationMocks, routerMocks } from "@/test/setup";
import { renderWithQueryClient } from "@/test/test-utils";
import type { PlayHubResponse } from "@/types/play-hub";
import { UserRole } from "@/types/auth";
import type { CasualLobbyView } from "@/types/casual-match";
import type { TrainingLobbyView } from "@/types/training-match";

const socketMocks = vi.hoisted(() => {
  let handlers: Record<string, Array<(payload: any) => void>> = {};
  const socket = {
    on: vi.fn((event: string, handler: (payload: any) => void) => {
      handlers[event] ??= [];
      handlers[event].push(handler);
      return socket;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  const io = vi.fn(() => socket);

  return {
    socket,
    io,
    emitEvent: (event: string, payload: any) => {
      for (const handler of handlers[event] || []) {
        handler(payload);
      }
    },
    reset: () => {
      handlers = {};
      socket.on.mockClear();
      socket.emit.mockClear();
      socket.disconnect.mockClear();
      io.mockClear();
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/match.service", () => ({
  matchService: {
    getPlayHub: vi.fn(),
  },
}));

vi.mock("@/services/training-match.service", () => ({
  trainingMatchService: {
    getLobby: vi.fn(),
    createSession: vi.fn(),
  },
}));

vi.mock("@/services/casual-match.service", () => ({
  casualMatchService: {
    getLobby: vi.fn(),
  },
}));

vi.mock("socket.io-client", () => ({
  io: socketMocks.io,
}));

const mockUseAuth = vi.mocked(useAuth);
const mockGetPlayHub = vi.mocked(matchService.getPlayHub);
const mockGetTrainingLobby = vi.mocked(trainingMatchService.getLobby);
const mockCreateTrainingSession = vi.mocked(trainingMatchService.createSession);
const mockGetCasualLobby = vi.mocked(casualMatchService.getLobby);

const authenticatedContext = {
  user: {
    id: 7,
    email: "ash@kanto.com",
    firstName: "Ash",
    lastName: "Ketchum",
    avatarUrl: "",
    role: UserRole.USER as const,
    isPro: false,
    isActive: true,
    createdAt: new Date(),
  },
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
};

const emptyPlayHub = (): PlayHubResponse => ({
  playerId: 7,
  ranked: {
    enabled: false,
    status: "coming_soon",
  },
  summary: {
    liveMatches: 0,
    readyMatches: 0,
    completedMatches: 0,
    totalMatches: 0,
    totalDecks: 2,
  },
  matches: [],
  recentDecks: [],
});

const buildMatch = (
  overrides: Partial<PlayHubResponse["matches"][number]> = {},
): PlayHubResponse["matches"][number] => ({
  id: 10,
  tournamentId: 55,
  tournamentName: "Kanto Cup",
  opponentName: "Blue",
  round: 3,
  phase: "qualification",
  status: "scheduled",
  scheduledDate: "2026-03-20T10:00:00.000Z",
  startedAt: null,
  finishedAt: null,
  playerAScore: 0,
  playerBScore: 0,
  onlineSessionStatus: null,
  ...overrides,
});

const trainingLobby = (
  overrides: Partial<TrainingLobbyView> = {},
): TrainingLobbyView => ({
  availableDecks: [
    {
      deckId: 1,
      deckName: "Gardevoir ex",
      eligible: true,
      reasons: [],
      totalCards: 60,
    },
  ],
  aiDeckPresets: [
    {
      id: "charizard",
      name: "Charizard ex",
      cardCount: 60,
    },
  ],
  difficulties: ["easy", "standard"],
  activeSessions: [],
  ...overrides,
});

const casualLobby = (
  overrides: Partial<CasualLobbyView> = {},
): CasualLobbyView => ({
  availableDecks: [
    {
      deckId: 9,
      deckName: "Miraidon ex",
      eligible: true,
      reasons: [],
      totalCards: 60,
    },
  ],
  activeSessions: [],
  queueStatus: "idle" as const,
  ...overrides,
});

const renderPage = () => renderWithQueryClient(<PlayPage />);

describe("PlayPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketMocks.reset();
    navigationMocks.reset();
    navigationMocks.setPathname("/play");
    mockUseAuth.mockReturnValue(authenticatedContext);
    mockGetPlayHub.mockResolvedValue(emptyPlayHub());
    mockGetTrainingLobby.mockResolvedValue(trainingLobby());
    mockGetCasualLobby.mockResolvedValue(casualLobby());
    mockCreateTrainingSession.mockResolvedValue({
      sessionId: 77,
    } as any);
  });

  it("sélectionne l'onglet tournois par défaut et synchronise l'URL", async () => {
    mockGetPlayHub.mockResolvedValue({
      ...emptyPlayHub(),
      summary: {
        ...emptyPlayHub().summary,
        readyMatches: 1,
        totalMatches: 1,
      },
      matches: [buildMatch()],
    });

    renderPage();

    await screen.findByRole("heading", { name: /^Tournois$/, level: 2 });

    expect(
      screen.getByRole("tab", { name: /Tournois/i }),
    ).toHaveAttribute("data-state", "active");

    await waitFor(() =>
      expect(routerMocks.replace).toHaveBeenCalledWith("/play?tab=tournois", {
        scroll: false,
      }),
    );
  });

  it("corrige un onglet invalide vers le meilleur mode disponible", async () => {
    navigationMocks.setSearchParams("tab=oops");
    mockGetTrainingLobby.mockResolvedValue(
      trainingLobby({
        activeSessions: [
          {
            sessionId: 42,
            status: "ACTIVE",
            aiDeckPresetId: "charizard",
            aiDeckPresetName: "Charizard ex",
            aiDifficulty: "standard",
            turnNumber: 5,
            awaitingPlayerAction: true,
            updatedAt: "2026-03-20T09:00:00.000Z",
            createdAt: "2026-03-20T08:00:00.000Z",
          },
        ],
      }),
    );

    renderPage();

    await screen.findByRole("heading", { name: /^Entraînement$/, level: 2 });

    expect(screen.getByRole("tab", { name: /IA/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    await waitFor(() =>
      expect(routerMocks.replace).toHaveBeenCalledWith("/play?tab=ia", {
        scroll: false,
      }),
    );
  });

  it("agrège et ordonne les cartes de reprise en limitant à trois", async () => {
    mockGetPlayHub.mockResolvedValue({
      ...emptyPlayHub(),
      summary: {
        ...emptyPlayHub().summary,
        liveMatches: 1,
        readyMatches: 1,
        totalMatches: 2,
      },
      matches: [
        buildMatch({
          id: 1,
          opponentName: "Cynthia",
          status: "in_progress",
          startedAt: "2026-03-20T10:30:00.000Z",
          scheduledDate: null,
        }),
        buildMatch({
          id: 2,
          opponentName: "Blue",
          status: "scheduled",
        }),
      ],
    });
    mockGetTrainingLobby.mockResolvedValue(
      trainingLobby({
        activeSessions: [
          {
            sessionId: 99,
            status: "ACTIVE",
            aiDeckPresetId: "charizard",
            aiDeckPresetName: "Charizard ex",
            aiDifficulty: "standard",
            turnNumber: 6,
            awaitingPlayerAction: true,
            updatedAt: "2026-03-20T11:00:00.000Z",
            createdAt: "2026-03-20T10:00:00.000Z",
          },
        ],
      }),
    );
    mockGetCasualLobby.mockResolvedValue(
      casualLobby({
        activeSessions: [
          {
            sessionId: 88,
            status: "ACTIVE",
            opponentName: "Red",
            ownDeckSelected: true,
            turnNumber: 7,
            awaitingPlayerAction: true,
            updatedAt: "2026-03-20T11:10:00.000Z",
            createdAt: "2026-03-20T10:10:00.000Z",
          },
        ],
      }),
    );

    renderPage();

    const items = await screen.findAllByTestId("resume-item");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("vs Cynthia");
    expect(items[1]).toHaveTextContent("vs Blue");
    expect(items[2]).toHaveTextContent("Charizard ex");
    expect(items.some((item) => item.textContent?.includes("vs Red"))).toBe(
      false,
    );
  });

  it("filtre les matches dans l'onglet tournois via la recherche", async () => {
    mockGetPlayHub.mockResolvedValue({
      ...emptyPlayHub(),
      summary: {
        ...emptyPlayHub().summary,
        completedMatches: 2,
        totalMatches: 2,
      },
      matches: [
        buildMatch({
          id: 21,
          opponentName: "Brock",
          status: "finished",
          startedAt: "2026-03-18T09:00:00.000Z",
          finishedAt: "2026-03-18T09:45:00.000Z",
        }),
        buildMatch({
          id: 22,
          opponentName: "Misty",
          tournamentName: "Johto Cup",
          status: "finished",
          startedAt: "2026-03-17T09:00:00.000Z",
          finishedAt: "2026-03-17T09:45:00.000Z",
        }),
      ],
    });

    renderPage();

    const searchInput = await screen.findByPlaceholderText(
      /Rechercher un tournoi, un adversaire ou un match/i,
    );
    await userEvent.type(searchInput, "Brock");

    await waitFor(() => expect(screen.getByText("vs Brock")).toBeInTheDocument());
    expect(screen.queryByText("vs Misty")).not.toBeInTheDocument();
  });

  it("lance une session IA avec les sélections par défaut", async () => {
    navigationMocks.setSearchParams("tab=ia");

    renderPage();

    const launchButton = await screen.findByRole("button", {
      name: /Lancer la partie/i,
    });
    await waitFor(() => expect(launchButton).toBeEnabled());
    await userEvent.click(launchButton);

    await waitFor(() =>
      expect(mockCreateTrainingSession).toHaveBeenCalledWith({
        deckId: 1,
        aiDeckPresetId: "charizard",
        difficulty: "standard",
      }),
    );
    expect(routerMocks.push).toHaveBeenCalledWith("/play/training/77");
  });

  it("gère le matchmaking duel et redirige lorsqu'un adversaire est trouvé", async () => {
    navigationMocks.setSearchParams("tab=duel");

    renderPage();

    const queueButton = await screen.findByRole("button", {
      name: /Lancer la recherche/i,
    });
    await userEvent.click(queueButton);

    await waitFor(() => expect(socketMocks.io).toHaveBeenCalled());
    expect(socketMocks.socket.emit).toHaveBeenCalledWith("matchmaking_join", {
      deckId: 9,
    });

    await act(async () => {
      socketMocks.emitEvent("matchmaking_matched", { sessionId: 55 });
    });

    await waitFor(() =>
      expect(routerMocks.push).toHaveBeenCalledWith("/play/casual/55"),
    );
  });

  it("affiche un état invité simplifié quand l'utilisateur n'est pas connecté", async () => {
    mockUseAuth.mockReturnValue({
      ...authenticatedContext,
      user: null,
      isAuthenticated: false,
    });

    renderPage();

    expect(
      screen.getByText(/Un hub clair pour reprendre vos matches et lancer vos parties/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Tournoi")).toBeInTheDocument();
    expect(screen.getByText("IA")).toBeInTheDocument();
    expect(screen.getByText("Duel")).toBeInTheDocument();
  });

  it("affiche l'état profil joueur manquant", async () => {
    mockGetPlayHub.mockResolvedValue({
      ...emptyPlayHub(),
      playerId: null,
    });

    renderPage();

    expect(
      await screen.findByText(/Votre compte n’est pas encore prêt/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ouvrir mon profil/i }),
    ).toHaveAttribute("href", "/profile");
  });
});
