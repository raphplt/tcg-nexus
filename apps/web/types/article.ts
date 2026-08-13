/** Supported editorial state for a blog article. */
export type ArticleStatus = "draft" | "published";

/** Blog article returned by the API. */
export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  image?: string | null;
  link?: string | null;
  content?: string | null;
  status: ArticleStatus;
  locale: "fr" | "en";
  metaTitle?: string | null;
  metaDescription?: string | null;
  authorId?: number | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Values accepted by article create and update operations. */
export interface ArticlePayload {
  title: string;
  slug?: string;
  excerpt?: string | null;
  image?: string | null;
  link?: string | null;
  content?: string | null;
  status?: ArticleStatus;
  locale?: "fr" | "en";
  metaTitle?: string | null;
  metaDescription?: string | null;
}
