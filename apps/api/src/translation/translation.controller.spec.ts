import { Test, TestingModule } from "@nestjs/testing";
import { TranslationController } from "./translation.controller";
import { TranslationService } from "./translation.service";

describe("TranslationController", () => {
  let controller: TranslationController;
  let service: { findAllGrouped: jest.Mock; upsertMany: jest.Mock };

  beforeEach(async () => {
    service = {
      findAllGrouped: jest.fn().mockResolvedValue({ fr: {}, en: {} }),
      upsertMany: jest.fn().mockResolvedValue(5),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslationController],
      providers: [{ provide: TranslationService, useValue: service }],
    }).compile();

    controller = module.get<TranslationController>(TranslationController);
  });

  it("delegates findAll to translationService.findAllGrouped", async () => {
    const result = await controller.findAll("fr");
    expect(service.findAllGrouped).toHaveBeenCalledWith("fr");
    expect(result).toEqual({ fr: {}, en: {} });
  });

  it("delegates upsert to translationService.upsertMany and returns count", async () => {
    const dto = {
      entries: [{ locale: "fr", key: "hello", value: "bonjour" }],
    };

    const result = await controller.upsert(dto);
    expect(service.upsertMany).toHaveBeenCalledWith(dto.entries);
    expect(result).toEqual({ saved: 5 });
  });
});
