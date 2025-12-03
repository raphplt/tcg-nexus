import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";
import { UserRole, type User } from "@/types/auth";

vi.mock("@/services/auth.service", () => ({
  authService: {
    getProfile: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    scheduleRefresh: vi.fn(),
  },
  default: {},
}));

const mockUser: User = {
  id: 1,
  email: "ash@kanto.com",
  firstName: "Ash",
  lastName: "Ketchum",
  avatarUrl: "/avatar.png",
  role: UserRole.USER as const,
  isPro: false,
  createdAt: new Date(),
};

const TestConsumer = () => {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-user">{user?.email ?? "anon"}</div>
      <div data-testid="auth-status">{isAuthenticated ? "auth" : "guest"}</div>
      <div data-testid="auth-loading">{isLoading ? "loading" : "idle"}</div>
      <button
        onClick={() => login({ email: "ash@kanto.com", password: "pikachu" })}
      >
        trigger-login
      </button>
      <button onClick={() => logout()}>trigger-logout</button>
    </div>
  );
};

const setup = () =>
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );

const mockGetProfile = vi.mocked(authService.getProfile);
const mockLogin = vi.mocked(authService.login);
const mockLogout = vi.mocked(authService.logout);

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("charge le profil utilisateur au montage et expose le statut authentifié", async () => {
    mockGetProfile.mockResolvedValueOnce(mockUser);
    setup();

    expect(screen.getByTestId("auth-loading")).toHaveTextContent("loading");

    await waitFor(() =>
      expect(screen.getByTestId("auth-user")).toHaveTextContent(mockUser.email),
    );
    expect(screen.getByTestId("auth-status")).toHaveTextContent("auth");
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });

  it("permet la connexion et redirige vers l'accueil", async () => {
    mockGetProfile.mockRejectedValueOnce({ response: { status: 401 } });
    mockLogin.mockResolvedValueOnce({ user: mockUser });

    setup();
    const user = userEvent.setup();

    await waitFor(() =>
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("idle"),
    );

    await user.click(screen.getByText("trigger-login"));

    await waitFor(() =>
      expect(screen.getByTestId("auth-user")).toHaveTextContent(mockUser.email),
    );

    const router = useRouter();
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("déconnecte l'utilisateur et renvoie vers la page de login", async () => {
    mockGetProfile.mockResolvedValueOnce(mockUser);
    mockLogout.mockResolvedValueOnce();

    setup();
    const user = userEvent.setup();

    await screen.findByText(mockUser.email);
    await user.click(screen.getByText("trigger-logout"));

    await waitFor(() =>
      expect(screen.getByTestId("auth-status")).toHaveTextContent("guest"),
    );

    const router = useRouter();
    expect(router.push).toHaveBeenCalledWith("/auth/login");
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
