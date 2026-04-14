import { fetcher } from "@/utils/fetch";
import type { DashboardData } from "@/types/dashboard";

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    return fetcher<DashboardData>("/dashboard");
  },
};
