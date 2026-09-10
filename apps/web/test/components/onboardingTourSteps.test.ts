import { describe, expect, it } from "vitest";
import {
  buildProductTourSteps,
  type ProductTourCopy,
} from "@/components/Onboarding/tourSteps";

const copy: ProductTourCopy = {
  previous: "Previous",
  next: "Next",
  done: "Done",
  close: "Close",
  skip: "Skip",
  progress: "{{current}} of {{total}}",
  steps: Array.from({ length: 7 }, (_, index) => ({
    title: `Step ${index + 1}`,
    description: `Description ${index + 1}`,
  })),
};

describe("buildProductTourSteps", () => {
  it("targets stable desktop onboarding anchors", () => {
    const steps = buildProductTourSteps(copy, false);

    expect(steps).toHaveLength(7);
    expect(steps[0]?.element).toBe("[data-onboarding='dashboard-header']");
    expect(steps[6]?.element).toBe("[data-onboarding='guided-tour']");
    expect(steps.every((step) => step.skipMissingElement)).toBe(true);
  });

  it("uses centered target-free steps on mobile", () => {
    const steps = buildProductTourSteps(copy, true);

    expect(steps).toHaveLength(7);
    expect(steps.every((step) => step.element === undefined)).toBe(true);
  });
});
