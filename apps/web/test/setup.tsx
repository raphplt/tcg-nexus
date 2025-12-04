import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

// Polyfill for pointer capture (required by Radix UI Select in jsdom)
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
}

// Mock ResizeObserver for Radix UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const storage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
})();

vi.stubGlobal("localStorage", storage);
vi.stubGlobal("sessionStorage", storage);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const push = vi.fn();
const replace = vi.fn();
const prefetch = vi.fn();

vi.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push, replace, prefetch }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: (() => {
    const LinkMock = React.forwardRef<HTMLAnchorElement, any>(
      ({ href, children, ...rest }, ref) => (
        <a
          href={typeof href === "string" ? href : ""}
          ref={ref}
          {...rest}
        >
          {children}
        </a>
      ),
    );
    LinkMock.displayName = "NextLinkMock";
    return LinkMock;
  })(),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const {
      src,
      alt,
      fill: _fill,
      priority: _priority,
      onLoadingComplete,
      ...rest
    } = props;

    if (typeof onLoadingComplete === "function") {
      setTimeout(() => onLoadingComplete(), 0);
    }

    return (
      <img
        src={typeof src === "string" ? src : src?.src ?? ""}
        alt={alt || ""}
        {...rest}
      />
    );
  },
}));

export const routerMocks = { push, replace, prefetch };
