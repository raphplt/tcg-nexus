import { Article, CreateArticleDto, UpdateArticleDto } from "@/types/article";
import { fetcher } from "@/utils/fetch";

export const articleService = {
  async getAll(): Promise<Article[]> {
    return fetcher<Article[]>("/articles");
  },

  async getById(id: number | string): Promise<Article> {
    return fetcher<Article>(`/articles/${id}`);
  },

  async create(data: CreateArticleDto): Promise<Article> {
    return fetcher<Article>("/articles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: number | string, data: UpdateArticleDto): Promise<Article> {
    return fetcher<Article>(`/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: number | string): Promise<void> {
    return fetcher<void>(`/articles/${id}`, {
      method: "DELETE",
    });
  },
};
