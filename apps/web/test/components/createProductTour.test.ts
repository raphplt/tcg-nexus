import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProductTour } from "@/components/Onboarding/createProductTour";
import type { ProductTourCopy } from "@/components/Onboarding/tourSteps";

const copy: ProductTourCopy = {
  previous: "Previous",
  next: "Next",
  done: "Done",
  close: "Close tour",
  skip: "Skip tour",
  progress: "{{current}} of {{total}}",
  steps: Array.from({ length: 7 }, (_, index) => ({
    title: `Step ${index + 1}`,
    description: `Description ${index + 1}`,
  })),
};

describe("createProductTour", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it("offers an explicit accessible skip action", () => {
    const onSkip = vi.fn();
    const onDestroyed = vi.fn();
    const tour = createProductTour({
      copy,
      isMobile: true,
      onComplete: vi.fn(),
      onSkip,
      onDestroyed,
    });

    tour.drive();
    const skip = document.querySelector<HTMLButtonElement>(
      ".tcg-onboarding-skip",
    );
    const close = document.querySelector<HTMLButtonElement>(
      ".driver-popover-close-btn",
    );

    expect(skip).toHaveTextContent("Skip tour");
    expect(close).toHaveAttribute("aria-label", "Close tour");
    fireEvent.click(skip!);
    expect(onSkip).toHaveBeenCalledOnce();
    expect(onDestroyed).toHaveBeenCalledOnce();
  });

  it("records completion without also recording a skip", () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const tour = createProductTour({
      copy,
      isMobile: true,
      onComplete,
      onSkip,
      onDestroyed: vi.fn(),
    });

    tour.drive(6);
    fireEvent.click(
      document.querySelector<HTMLButtonElement>(".driver-popover-next-btn")!,
    );

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onSkip).not.toHaveBeenCalled();
  });
});
