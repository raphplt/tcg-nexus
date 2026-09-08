import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";

describe("usePaginatedQuery", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("fetches data using key, fetcherFn and params", async () => {
    const fetcherFn = vi
      .fn()
      .mockImplementation((params: { page: number }) =>
        Promise.resolve({ items: [`item-${params.page}`], page: params.page }),
      );

    const { result } = renderHook(
      () => usePaginatedQuery(["items"], fetcherFn, { page: 1 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ items: ["item-1"], page: 1 });
    expect(fetcherFn).toHaveBeenCalledWith({ page: 1 });
  });

  it("retains placeholder data when params change", async () => {
    const fetcherFn = vi
      .fn()
      .mockImplementation((params: { page: number }) =>
        Promise.resolve({ items: [`item-${params.page}`], page: params.page }),
      );

    const { result, rerender } = renderHook(
      ({ page }) => usePaginatedQuery(["items"], fetcherFn, { page }),
      {
        wrapper: createWrapper(),
        initialProps: { page: 1 },
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual({ items: ["item-1"], page: 1 });

    // Change page to 2
    rerender({ page: 2 });

    await waitFor(() => {
      expect(result.current.data).toEqual({ items: ["item-2"], page: 2 });
    });
    expect(fetcherFn).toHaveBeenCalledWith({ page: 2 });
  });
});
