import type { OnboardingOutcome, OnboardingState } from "@/types/onboarding";
import { authedFetch } from "@/utils/fetch";

/** Version of the product tour currently presented by the web application. */
export const CURRENT_ONBOARDING_VERSION = 1;

/** API client for reading and updating the current user's onboarding state. */
export const onboardingService = {
  /** Retrieves the current user's onboarding state. */
  async getState(): Promise<OnboardingState> {
    return authedFetch<OnboardingState>("GET", "/users/me/onboarding");
  },

  /** Persists a terminal outcome for the current product-tour version. */
  async updateState(status: OnboardingOutcome): Promise<OnboardingState> {
    return authedFetch<OnboardingState>("PATCH", "/users/me/onboarding", {
      data: { version: CURRENT_ONBOARDING_VERSION, status },
    });
  },
};
