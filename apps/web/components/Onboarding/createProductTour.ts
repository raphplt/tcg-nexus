import { driver, type Driver } from "driver.js";
import { buildProductTourSteps, type ProductTourCopy } from "./tourSteps";

interface CreateProductTourOptions {
  copy: ProductTourCopy;
  isMobile: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onDestroyed: () => void;
}

/** Creates a themed, accessible Driver.js tour with explicit skip semantics. */
export function createProductTour({
  copy,
  isMobile,
  onComplete,
  onSkip,
  onDestroyed,
}: CreateProductTourOptions): Driver {
  let settled = false;
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    onDestroyed();
  };

  const tour = driver({
    allowClose: true,
    allowKeyboardControl: true,
    animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    disableActiveInteraction: true,
    overlayClickBehavior: "close",
    overlayOpacity: 0.72,
    popoverClass: "tcg-onboarding-popover",
    popoverOffset: 12,
    progressText: copy.progress,
    showProgress: true,
    skipMissingElement: true,
    smoothScroll: true,
    stagePadding: 8,
    stageRadius: 10,
    nextBtnText: copy.next,
    prevBtnText: copy.previous,
    doneBtnText: copy.done,
    steps: buildProductTourSteps(copy, isMobile),
    onPopoverRender: (popover) => {
      popover.closeButton.setAttribute("aria-label", copy.close);
      if (popover.footerButtons.querySelector(".tcg-onboarding-skip")) return;

      const skipButton = document.createElement("button");
      skipButton.type = "button";
      skipButton.className = "driver-popover-close-btn tcg-onboarding-skip";
      skipButton.setAttribute("aria-label", copy.skip);
      skipButton.textContent = copy.skip;
      popover.footerButtons.prepend(skipButton);
    },
    onCloseClick: () => {
      if (!settled) {
        settled = true;
        onSkip();
      }
      tour.destroy();
      cleanup();
    },
    onDoneClick: () => {
      settled = true;
      onComplete();
      tour.destroy();
      cleanup();
    },
    onDestroyStarted: (_element, _step, { driver: activeTour }) => {
      if (!settled) {
        settled = true;
        onSkip();
      }
      activeTour.destroy();
      cleanup();
    },
    onDestroyed: cleanup,
  });

  return tour;
}
