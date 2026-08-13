import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  Not,
  Repository,
} from "typeorm";
import { AdminArticleQueryDto, ArticleQueryDto } from "./dto/article-query.dto";
import { CreateArticleDto } from "./dto/create-article.dto";
import { UpdateArticleDto } from "./dto/update-article.dto";
import { Article, ArticleStatus } from "./entities/article.entity";

/** Manages the article publishing lifecycle and public article queries. */
@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  /**
   * Creates an article and assigns a collision-free slug.
   *
   * @param createArticleDto - Editorial article values.
   * @param authorId - Authenticated author identifier.
   * @returns Persisted article.
   */
  async create(
    createArticleDto: CreateArticleDto,
    authorId: number,
  ): Promise<Article> {
    const status = createArticleDto.status ?? ArticleStatus.DRAFT;
    const slug = await this.createUniqueSlug(
      createArticleDto.slug ?? createArticleDto.title,
    );
    const article = this.articleRepository.create({
      ...createArticleDto,
      slug,
      status,
      authorId,
      publishedAt: this.resolvePublishedAt(
        status,
        createArticleDto.publishedAt,
      ),
    });

    return this.articleRepository.save(article);
  }

  /**
   * Lists published articles for public pages.
   *
   * @param query - Locale, search, and result limit filters.
   * @returns Published articles ordered from newest to oldest.
   */
  findAll(query: ArticleQueryDto = new ArticleQueryDto()): Promise<Article[]> {
    const limit = query.limit ?? 12;
    const page = query.page ?? 1;
    const where: FindOptionsWhere<Article> = {
      status: ArticleStatus.PUBLISHED,
      publishedAt: LessThanOrEqual(new Date()),
      ...(query.locale ? { locale: query.locale } : {}),
      ...(query.search ? { title: ILike(`%${query.search}%`) } : {}),
    };

    return this.articleRepository.find({
      where,
      order: { publishedAt: "DESC", createdAt: "DESC" },
      take: limit,
      skip: query.offset ?? (page - 1) * limit,
    });
  }

  /**
   * Finds a published article by its stable URL slug.
   *
   * @param slug - Article URL slug.
   * @param locale - Optional requested locale.
   * @returns Published article.
   * @throws NotFoundException If no matching published article exists.
   */
  async findBySlug(slug: string, locale?: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: {
        slug,
        status: ArticleStatus.PUBLISHED,
        publishedAt: LessThanOrEqual(new Date()),
        ...(locale ? { locale } : {}),
      },
    });
    if (!article) {
      throw new NotFoundException("ARTICLE_NOT_FOUND");
    }
    return article;
  }

  /**
   * Finds a published article by its legacy numeric identifier.
   *
   * @param id - Article identifier.
   * @returns Published article.
   * @throws NotFoundException If the article is missing or is a draft.
   */
  async findPublishedById(id: number): Promise<Article> {
    const article = await this.articleRepository.findOneBy({
      id,
      status: ArticleStatus.PUBLISHED,
      publishedAt: LessThanOrEqual(new Date()),
    });
    if (!article) {
      throw new NotFoundException("ARTICLE_NOT_FOUND");
    }
    return article;
  }

  /**
   * Lists drafts and publications for the editorial interface.
   *
   * @param query - Editorial filters.
   * @returns Matching articles ordered by last update.
   */
  findAllAdmin(
    query: AdminArticleQueryDto = new AdminArticleQueryDto(),
  ): Promise<Article[]> {
    const limit = query.limit ?? 12;
    const page = query.page ?? 1;
    const where: FindOptionsWhere<Article> = {
      ...(query.locale ? { locale: query.locale } : {}),
      ...(query.status ? { status: query.status as ArticleStatus } : {}),
      ...(query.search ? { title: ILike(`%${query.search}%`) } : {}),
    };

    return this.articleRepository.find({
      where,
      order: { updatedAt: "DESC" },
      take: limit,
      skip: query.offset ?? (page - 1) * limit,
    });
  }

  /**
   * Finds any article by identifier for editorial operations.
   *
   * @param id - Article identifier.
   * @returns Existing article.
   * @throws NotFoundException If the article does not exist.
   */
  async findOne(id: number): Promise<Article> {
    const article = await this.articleRepository.findOneBy({ id });
    if (!article) {
      throw new NotFoundException("ARTICLE_NOT_FOUND");
    }
    return article;
  }

  /**
   * Updates an article and applies publication timestamps consistently.
   *
   * @param id - Article identifier.
   * @param updateArticleDto - Fields to update.
   * @returns Updated article.
   * @throws NotFoundException If the article does not exist.
   */
  async update(
    id: number,
    updateArticleDto: UpdateArticleDto,
  ): Promise<Article> {
    const article = await this.findOne(id);
    const status = updateArticleDto.status ?? article.status;
    const slug = updateArticleDto.slug
      ? await this.createUniqueSlug(updateArticleDto.slug, article.id)
      : article.slug;

    Object.assign(article, updateArticleDto, {
      slug,
      status,
      publishedAt: this.resolvePublishedAt(
        status,
        updateArticleDto.publishedAt ?? article.publishedAt,
      ),
    });

    return this.articleRepository.save(article);
  }

  /**
   * Deletes an article after verifying it exists.
   *
   * @param id - Article identifier.
   * @returns Nothing after successful deletion.
   * @throws NotFoundException If the article does not exist.
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.articleRepository.delete(id);
  }

  private resolvePublishedAt(
    status: ArticleStatus,
    publishedAt?: string | Date | null,
  ): Date | null {
    if (status !== ArticleStatus.PUBLISHED) {
      return null;
    }
    return publishedAt ? new Date(publishedAt) : new Date();
  }

  private async createUniqueSlug(
    source: string,
    ignoredId?: number,
  ): Promise<string> {
    const baseSlug = this.slugify(source) || "article";
    let slug = baseSlug;
    let suffix = 2;

    while (
      await this.articleRepository.findOne({
        where: {
          slug,
          ...(ignoredId ? { id: Not(ignoredId) } : {}),
        },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  private slugify(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 170);
  }
}
