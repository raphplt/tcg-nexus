export interface Article {
  id: number;
  title: string;
  image?: string;
  link?: string;
  content?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleDto {
  title: string;
  image?: string;
  link?: string;
  content?: string;
  publishedAt?: string;
}

export interface UpdateArticleDto extends Partial<CreateArticleDto> {}
