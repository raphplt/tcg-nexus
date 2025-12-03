import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { ReactElement } from "react";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

export const renderWithQueryClient = (
  ui: ReactElement,
  client: QueryClient = createQueryClient(),
) => ({
  queryClient: client,
  ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
});
