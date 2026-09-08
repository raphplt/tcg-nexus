import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Translation } from "./entities/translation.entity";
import { TranslationService } from "./translation.service";

describe("TranslationService", () => {
  let service: TranslationService;
  let repo: Partial<Record<keyof Repository<Translation>, jest.Mock>>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      upsert: jest.fn().mockResolvedValue({ identifiers: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        {
          provide: getRepositoryToken(Translation),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<TranslationService>(TranslationService);
  });

  describe("findAllGrouped", () => {
    it("returns grouped translations for supported locale", async () => {
      repo.find!.mockResolvedValueOnce([
        { locale: "fr", key: "auth.login", value: "Connexion" },
      ]);

      const result = await service.findAllGrouped("fr");
      expect(repo.find).toHaveBeenCalledWith({ where: { locale: "fr" } });
      expect(result.fr["auth.login"]).toBe("Connexion");
      expect(result.en).toEqual({});
    });

    it("queries all translations when locale is undefined or unsupported", async () => {
      repo.find!.mockResolvedValueOnce([
        { locale: "en", key: "home.title", value: "Welcome" },
        { locale: "fr", key: "home.title", value: "Bienvenue" },
      ]);

      const result = await service.findAllGrouped("unsupported-lang");
      expect(repo.find).toHaveBeenCalledWith({ where: {} });
      expect(result.en["home.title"]).toBe("Welcome");
      expect(result.fr["home.title"]).toBe("Bienvenue");
    });
  });

  describe("upsertMany", () => {
    it("deletes entries with empty values and upserts non-empty entries", async () => {
      const entries = [
        { locale: "fr", key: "delete.me", value: "   " },
        { locale: "en", key: "keep.me", value: "Save this" },
      ];

      const count = await service.upsertMany(entries);
      expect(count).toBe(2);
      expect(repo.delete).toHaveBeenCalledWith({
        locale: "fr",
        key: "delete.me",
      });
      expect(repo.upsert).toHaveBeenCalledWith(
        [{ locale: "en", key: "keep.me", value: "Save this" }],
        ["locale", "key"],
      );
    });

    it("handles only deletions without calling upsert", async () => {
      const entries = [{ locale: "fr", key: "remove.key", value: "" }];

      const count = await service.upsertMany(entries);
      expect(count).toBe(1);
      expect(repo.delete).toHaveBeenCalledWith({
        locale: "fr",
        key: "remove.key",
      });
      expect(repo.upsert).not.toHaveBeenCalled();
    });
  });
});
