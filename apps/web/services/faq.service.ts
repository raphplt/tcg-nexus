import { FaqItem } from "@/types/faq";
import { fetcher } from "@/utils/fetch";

export interface FaqQueryParams {
  category?: string;
  search?: string;
}

export const faqService = {
  async getAll(params: FaqQueryParams = {}): Promise<FaqItem[]> {
    return fetcher<FaqItem[]>("/faq", { params });
  },
};
