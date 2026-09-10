import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InfiniteScrollTrigger } from "@/components/Shared/InfiniteScrollTrigger";

describe("InfiniteScrollTrigger", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the next page when the end of the list becomes visible", () => {
    let notify: IntersectionObserverCallback = () => {};
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe = observe;
        disconnect = vi.fn();
      },
    );
    const onLoadMore = vi.fn();

    render(
      <InfiniteScrollTrigger
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
      />,
    );

    expect(observe).toHaveBeenCalled();
    notify(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("offers a button fallback and hides once everything is loaded", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const onLoadMore = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <InfiniteScrollTrigger
        hasNextPage
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Afficher plus" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(
      <InfiniteScrollTrigger
        hasNextPage
        isFetchingNextPage
        onLoadMore={onLoadMore}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Chargement...")).toBeInTheDocument();

    rerender(
      <InfiniteScrollTrigger
        hasNextPage={false}
        isFetchingNextPage={false}
        onLoadMore={onLoadMore}
      />,
    );
    expect(screen.queryByLabelText("Chargement...")).not.toBeInTheDocument();
  });
});
