import { api, API_BASE_URL, authedFetch } from "@/utils/fetch";
import { Article, ArticlePayload, ArticleStatus } from "@/types/article";

export interface ArticleFilters {
  locale?: string;
  search?: string;
  status?: ArticleStatus;
  page?: number;
  offset?: number;
  limit?: number;
}

/** Provides public and authenticated article API operations. */
export const articleService = {
  async getPublished(filters: ArticleFilters = {}): Promise<Article[]> {
    const response = await api.get<Article[]>("/articles", { params: filters });
    return response.data;
  },

  async getPublishedBySlug(slug: string, locale?: string): Promise<Article> {
    const response = await api.get<Article>(`/articles/slug/${slug}`, {
      params: { locale },
    });
    return response.data;
  },

  async getAdmin(filters: ArticleFilters = {}): Promise<Article[]> {
    return authedFetch<Article[]>("GET", "/articles/admin", {
      params: filters as Record<string, unknown>,
    });
  },

  async create(payload: ArticlePayload): Promise<Article> {
    return authedFetch<Article>("POST", "/articles", { data: payload });
  },

  async update(id: number, payload: Partial<ArticlePayload>): Promise<Article> {
    return authedFetch<Article>("PATCH", `/articles/${id}`, { data: payload });
  },

  async delete(id: number): Promise<void> {
    return authedFetch<void>("DELETE", `/articles/${id}`);
  },
};

function serverApiBaseUrl(): string {
  if (API_BASE_URL.startsWith("http")) return API_BASE_URL;
  return process.env.API_URL ?? "http://localhost:3001";
}

/** Fetches published articles from a Server Component. */
export async function getPublishedArticles(
  filters: ArticleFilters = {},
): Promise<Article[]> {
  try {
    const url = new URL("/articles", serverApiBaseUrl());
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    return response.json() as Promise<Article[]>;
  } catch {
    return [];
  }
}

/** Fetches one published article from a Server Component. */
export async function getPublishedArticle(
  slug: string,
  locale: string,
): Promise<Article | null> {
  try {
    const url = new URL(
      `/articles/slug/${encodeURIComponent(slug)}`,
      serverApiBaseUrl(),
    );
    url.searchParams.set("locale", locale);
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return response.json() as Promise<Article>;
  } catch {
    return null;
  }
}
