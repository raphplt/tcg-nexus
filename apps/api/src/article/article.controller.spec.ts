import { Test, TestingModule } from "@nestjs/testing";
import { UserRole } from "src/common/enums/user";
import { User } from "src/user/entities/user.entity";
import { ArticleController } from "./article.controller";
import { ArticleService } from "./article.service";

describe("ArticleController", () => {
  let controller: ArticleController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllAdmin: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    findPublishedById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [{ provide: ArticleService, useValue: service }],
    }).compile();

    controller = module.get<ArticleController>(ArticleController);
    jest.clearAllMocks();
  });

  it("delegates public and editorial operations", async () => {
    const user = { id: 7, role: UserRole.ADMIN } as User;
    service.create.mockReturnValue("created");
    service.findAll.mockReturnValue("all");
    service.findAllAdmin.mockReturnValue("admin-all");
    service.findOne.mockReturnValue("admin-one");
    service.findBySlug.mockReturnValue("slug-one");
    service.findPublishedById.mockReturnValue("legacy-one");
    service.update.mockReturnValue("updated");
    service.remove.mockReturnValue("removed");

    expect(await controller.create({ title: "Article" }, user)).toBe("created");
    expect(await controller.findAll({ limit: 12 })).toBe("all");
    expect(await controller.findAllAdmin({ limit: 12 })).toBe("admin-all");
    expect(await controller.findOneAdmin(1)).toBe("admin-one");
    expect(await controller.findBySlug("article", "fr")).toBe("slug-one");
    expect(await controller.findOne(1)).toBe("legacy-one");
    expect(await controller.update(2, {})).toBe("updated");
    expect(await controller.remove(3)).toBe("removed");
    expect(service.create).toHaveBeenCalledWith({ title: "Article" }, 7);
  });
});
