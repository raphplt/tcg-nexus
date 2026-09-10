import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/components/Onboarding/OnboardingProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { navigationMocks } from "../setup";

const { authState, onboardingApi, driver, createProductTour } = vi.hoisted(
  () => {
    const driverInstance = {
      drive: vi.fn(),
      destroy: vi.fn(),
      isActive: vi.fn(() => false),
    };
    return {
      authState: {
        user: { id: 7, firstName: "Sacha" },
        isAuthenticated: true,
        isLoading: false,
      },
      onboardingApi: {
        getState: vi.fn(),
        updateState: vi.fn(),
      },
      driver: driverInstance,
      createProductTour: vi.fn(() => driverInstance),
    };
  },
);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/services/onboarding.service", () => ({
  CURRENT_ONBOARDING_VERSION: 1,
  onboardingService: onboardingApi,
}));

vi.mock("@/components/Onboarding/createProductTour", () => ({
  createProductTour,
}));

function ReplayControl() {
  const { replayTour } = useOnboarding();
  return <button onClick={replayTour}>replay</button>;
}

function renderProvider() {
  return render(
    <SidebarProvider>
      <OnboardingProvider>
        <ReplayControl />
      </OnboardingProvider>
    </SidebarProvider>,
  );
}

describe("OnboardingProvider", () => {
  beforeEach(() => {
    navigationMocks.setPathname("/dashboard");
    onboardingApi.getState.mockReset();
    onboardingApi.updateState.mockReset();
    createProductTour.mockClear();
    driver.drive.mockClear();
    driver.destroy.mockClear();
    driver.isActive.mockReturnValue(false);
  });

  it("offers onboarding once when the current version is pending", async () => {
    onboardingApi.getState.mockResolvedValueOnce({
      version: 0,
      status: "pending",
      updatedAt: null,
    });
    onboardingApi.updateState.mockResolvedValueOnce({
      version: 1,
      status: "skipped",
      updatedAt: "2026-09-10T08:00:00.000Z",
    });
    const user = userEvent.setup();

    renderProvider();

    expect(
      await screen.findByText("Bienvenue sur TCG Nexus, Sacha !"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Explorer par moi-même" }),
    );

    await waitFor(() =>
      expect(onboardingApi.updateState).toHaveBeenCalledWith("skipped"),
    );
    expect(screen.queryByText("Bienvenue sur TCG Nexus, Sacha !")).toBeNull();
  });

  it("does not interrupt a user who already handled this version", async () => {
    onboardingApi.getState.mockResolvedValueOnce({
      version: 1,
      status: "completed",
      updatedAt: "2026-09-10T08:00:00.000Z",
    });

    renderProvider();

    await waitFor(() => expect(onboardingApi.getState).toHaveBeenCalled());
    expect(screen.queryByText("Bienvenue sur TCG Nexus, Sacha !")).toBeNull();
  });

  it("allows a completed user to replay the tour", async () => {
    onboardingApi.getState.mockResolvedValueOnce({
      version: 1,
      status: "completed",
      updatedAt: "2026-09-10T08:00:00.000Z",
    });
    const user = userEvent.setup();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    renderProvider();
    await user.click(screen.getByRole("button", { name: "replay" }));

    await waitFor(() => expect(createProductTour).toHaveBeenCalledOnce());
    expect(driver.drive).toHaveBeenCalledOnce();
  });
});
