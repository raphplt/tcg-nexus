/** Product-onboarding outcomes persisted by the API. */
export type OnboardingStatus = "pending" | "completed" | "skipped";

/** Current onboarding state for the authenticated user. */
export interface OnboardingState {
  version: number;
  status: OnboardingStatus;
  updatedAt: string | null;
}

/** Terminal onboarding outcome accepted by the API. */
export type OnboardingOutcome = Exclude<OnboardingStatus, "pending">;
