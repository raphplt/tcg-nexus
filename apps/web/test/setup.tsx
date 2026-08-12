import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import React from "react";

if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture =
    Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture =
    Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture =
    Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.scrollIntoView =
    Element.prototype.scrollIntoView || (() => {});
}

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
  navigationMocks.reset();
});

const push = vi.fn();
const replace = vi.fn();
const prefetch = vi.fn();
const navigationState = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  params: {},
};

const setSearchParams = (
  next:
    | string
    | URLSearchParams
    | Record<string, string | number | boolean | undefined>,
) => {
  if (typeof next === "string") {
    navigationState.searchParams = new URLSearchParams(
      next.startsWith("?") ? next.slice(1) : next,
    );
    return;
  }

  if (next instanceof URLSearchParams) {
    navigationState.searchParams = new URLSearchParams(next.toString());
    return;
  }

  navigationState.searchParams = new URLSearchParams(
    Object.entries(next)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
};

vi.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({ push, replace, prefetch }),
  usePathname: () => navigationState.pathname,
  useSearchParams: () => new URLSearchParams(navigationState.searchParams),
  useParams: () => navigationState.params,
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: (() => {
    const LinkMock = React.forwardRef<HTMLAnchorElement, any>(
      ({ href, children, ...rest }, ref) => (
        <a href={typeof href === "string" ? href : ""} ref={ref} {...rest}>
          {children}
        </a>
      ),
    );
    LinkMock.displayName = "NextLinkMock";
    return LinkMock;
  })(),
}));

vi.mock("@/i18n/navigation", () => ({
  __esModule: true,
  Link: (() => {
    const LocalizedLinkMock = React.forwardRef<HTMLAnchorElement, any>(
      ({ href, locale: _locale, children, ...rest }, ref) => {
        const path = typeof href === "string" ? href : (href?.pathname ?? "");
        return (
          <a href={path} ref={ref} {...rest}>
            {children}
          </a>
        );
      },
    );
    LocalizedLinkMock.displayName = "LocalizedLinkMock";
    return LocalizedLinkMock;
  })(),
  useRouter: () => ({ push, replace, prefetch }),
  usePathname: () => navigationState.pathname,
  getPathname: ({ href }: { href: string }) => href,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  const messages = (await import("../messages/fr.json")).default as Record<
    string,
    unknown
  >;

  const resolve = (path: string): unknown =>
    path
      .split(".")
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === "object"
            ? (acc as Record<string, unknown>)[key]
            : undefined,
        messages,
      );

  const interpolate = (text: string, values?: Record<string, unknown>) =>
    values
      ? text.replace(/\{(\w+)\}/g, (match, key) =>
          key in values ? String(values[key]) : match,
        )
      : text;

  const useTranslations = (namespace?: string) => {
    const t = (key: string, values?: Record<string, unknown>) => {
      const full = namespace ? `${namespace}.${key}` : key;
      const value = resolve(full);
      return typeof value === "string" ? interpolate(value, values) : full;
    };
    t.rich = (key: string, values?: Record<string, unknown>) => t(key, values);
    t.raw = (key: string) => resolve(namespace ? `${namespace}.${key}` : key);
    t.has = (key: string) =>
      resolve(namespace ? `${namespace}.${key}` : key) !== undefined;
    return t;
  };

  return {
    ...actual,
    useLocale: () => "fr",
    useMessages: () => messages,
    useTranslations,
  };
});

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
        src={typeof src === "string" ? src : (src?.src ?? "")}
        alt={alt || ""}
        {...rest}
      />
    );
  },
}));

export const routerMocks = { push, replace, prefetch };
export const navigationMocks = {
  setPathname: (pathname: string) => {
    navigationState.pathname = pathname;
  },
  setSearchParams,
  setParams: (params: Record<string, string>) => {
    navigationState.params = params;
  },
  reset: () => {
    navigationState.pathname = "/";
    navigationState.searchParams = new URLSearchParams();
    navigationState.params = {};
  },
};
