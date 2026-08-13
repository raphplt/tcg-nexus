import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ArticleService } from "./article.service";
import { Article, ArticleStatus } from "./entities/article.entity";

describe("ArticleService", () => {
  let service: ArticleService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    jest.clearAllMocks();
  });

  it("creates a draft with a generated slug and author", async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => ({ id: 1, ...value }));

    await expect(
      service.create({ title: "Énergie spéciale" }, 9),
    ).resolves.toMatchObject({
      id: 1,
      slug: "energie-speciale",
      status: ArticleStatus.DRAFT,
      authorId: 9,
    });
  });

  it("adds a suffix when a slug already exists", async () => {
    repo.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation(async (value) => value);

    const article = await service.create({ title: "News" }, 2);

    expect(article.slug).toBe("news-2");
  });

  it("only lists published articles", async () => {
    repo.find.mockResolvedValue([{ id: 1 }]);

    await expect(service.findAll({ locale: "fr", limit: 4 })).resolves.toEqual([
      { id: 1 },
    ]);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ArticleStatus.PUBLISHED,
          locale: "fr",
        }),
        take: 4,
      }),
    );
  });

  it("rejects a missing or draft public article", async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findBySlug("draft", "fr")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("updates an article and sets its first publication date", async () => {
    const article = {
      id: 3,
      title: "Draft",
      slug: "draft",
      status: ArticleStatus.DRAFT,
    } as Article;
    repo.findOneBy.mockResolvedValue(article);
    repo.save.mockImplementation(async (value) => value);

    const updated = await service.update(3, {
      status: ArticleStatus.PUBLISHED,
    });

    expect(updated.status).toBe(ArticleStatus.PUBLISHED);
    expect(updated.publishedAt).toBeInstanceOf(Date);
  });

  it("throws before updating or deleting a missing article", async () => {
    repo.findOneBy.mockResolvedValue(null);

    await expect(
      service.update(404, { title: "Missing" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
