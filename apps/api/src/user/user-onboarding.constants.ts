/** Current product-tour version understood by the API and web application. */
export const CURRENT_ONBOARDING_VERSION = 1;

/** Persisted outcome for the current user's product onboarding. */
export enum OnboardingStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  SKIPPED = "skipped",
}
