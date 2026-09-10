"use client";

import type { Driver } from "driver.js";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-hot-toast";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  CURRENT_ONBOARDING_VERSION,
  onboardingService,
} from "@/services/onboarding.service";
import type { OnboardingOutcome, OnboardingState } from "@/types/onboarding";
import { createProductTour } from "./createProductTour";
import { OnboardingWelcomeDialog } from "./OnboardingWelcomeDialog";
import type { ProductTourCopy } from "./tourSteps";

interface OnboardingProviderProps {
  children: ReactNode;
}

type TourSource = "automatic" | "manual";

interface OnboardingContextValue {
  replayTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** Returns the controls for manually replaying the product tour. */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

/** Coordinates automatic onboarding, manual replay, persistence, and cleanup. */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const t = useTranslations("Onboarding");
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, open, setOpen } = useSidebar();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const tourRef = useRef<Driver | null>(null);
  const checkedUserRef = useRef<number | null>(null);
  const autoHandledRef = useRef(false);
  const manualPendingRef = useRef(false);
  const previousSidebarOpenRef = useRef(true);

  const copy = useMemo<ProductTourCopy>(
    () => ({
      previous: t("controls.previous"),
      next: t("controls.next"),
      done: t("controls.done"),
      close: t("controls.close"),
      skip: t("controls.skip"),
      progress: t("controls.progress", {
        current: "{{current}}",
        total: "{{total}}",
      }),
      steps: (["1", "2", "3", "4", "5", "6", "7"] as const).map((step) => ({
        title: t(`steps.${step}.title`),
        description: t(`steps.${step}.description`),
      })),
    }),
    [t],
  );

  const persistOutcome = useCallback(
    async (outcome: OnboardingOutcome) => {
      try {
        const updatedState = await onboardingService.updateState(outcome);
        setState(updatedState);
      } catch {
        toast.error(t("saveError"));
      }
    },
    [t],
  );

  const startTour = useCallback(
    (source: TourSource) => {
      if (tourRef.current?.isActive()) return;
      setWelcomeOpen(false);
      previousSidebarOpenRef.current = open;
      if (!isMobile) setOpen(true);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const tour = createProductTour({
            copy,
            isMobile,
            onComplete: () => void persistOutcome("completed"),
            onSkip: () => {
              if (source === "automatic") void persistOutcome("skipped");
            },
            onDestroyed: () => {
              tourRef.current = null;
              if (!isMobile) setOpen(previousSidebarOpenRef.current);
            },
          });
          tourRef.current = tour;
          tour.drive();
        });
      });
    },
    [copy, isMobile, open, persistOutcome, setOpen],
  );

  const skipWelcome = useCallback(() => {
    if (!welcomeOpen) return;
    setWelcomeOpen(false);
    void persistOutcome("skipped");
  }, [persistOutcome, welcomeOpen]);

  const destroyTour = useCallback(() => {
    const activeTour = tourRef.current;
    tourRef.current = null;
    activeTour?.destroy();
    if (activeTour && !isMobile) {
      setOpen(previousSidebarOpenRef.current);
    }
  }, [isMobile, setOpen]);

  const replayTour = useCallback(() => {
    autoHandledRef.current = true;
    setWelcomeOpen(false);
    if (pathname !== "/dashboard") {
      manualPendingRef.current = true;
      router.push("/dashboard");
      return;
    }
    startTour("manual");
  }, [pathname, router, startTour]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      if (!isLoading && !isAuthenticated) {
        destroyTour();
        checkedUserRef.current = null;
        autoHandledRef.current = false;
        setState(null);
        setWelcomeOpen(false);
      }
      return;
    }
    if (checkedUserRef.current === user.id) return;

    checkedUserRef.current = user.id;
    let cancelled = false;
    void onboardingService
      .getState()
      .then((nextState) => {
        if (!cancelled) setState(nextState);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [destroyTour, isAuthenticated, isLoading, user]);

  useEffect(() => {
    if (
      pathname !== "/dashboard" ||
      !state ||
      state.version >= CURRENT_ONBOARDING_VERSION ||
      autoHandledRef.current
    ) {
      return;
    }
    autoHandledRef.current = true;
    setWelcomeOpen(true);
  }, [pathname, state]);

  useEffect(() => {
    if (
      pathname !== "/dashboard" ||
      !manualPendingRef.current ||
      !isAuthenticated ||
      isLoading
    ) {
      return;
    }
    manualPendingRef.current = false;
    startTour("manual");
  }, [isAuthenticated, isLoading, pathname, startTour]);

  useEffect(
    () => () => {
      tourRef.current?.destroy();
      tourRef.current = null;
    },
    [],
  );

  return (
    <OnboardingContext.Provider value={{ replayTour }}>
      {children}
      <OnboardingWelcomeDialog
        firstName={user?.firstName ?? ""}
        open={welcomeOpen}
        onStart={() => startTour("automatic")}
        onSkip={skipWelcome}
      />
    </OnboardingContext.Provider>
  );
}
