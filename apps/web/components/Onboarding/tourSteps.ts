import type { DriveStep } from "driver.js";

/** Localized copy used by the product-tour steps and controls. */
export interface ProductTourCopy {
  previous: string;
  next: string;
  done: string;
  close: string;
  skip: string;
  progress: string;
  steps: Array<{ title: string; description: string }>;
}

const DESKTOP_TARGETS = [
  "[data-onboarding='dashboard-header']",
  "[data-onboarding='global-search']",
  "[data-onboarding='collection']",
  "[data-onboarding='decks']",
  "[data-onboarding='play']",
  "[data-onboarding='marketplace']",
  "[data-onboarding='guided-tour']",
];

/** Builds the responsive Driver.js step list from localized copy. */
export function buildProductTourSteps(
  copy: ProductTourCopy,
  isMobile: boolean,
): DriveStep[] {
  return copy.steps.map((step, index) => ({
    ...(isMobile ? {} : { element: DESKTOP_TARGETS[index] }),
    waitForElement: isMobile ? 0 : 1_200,
    skipMissingElement: true,
    popover: {
      title: step.title,
      description: step.description,
      side: index === 1 ? "bottom" : "right",
      align: "start",
    },
  }));
}
