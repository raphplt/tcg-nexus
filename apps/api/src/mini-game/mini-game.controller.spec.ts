import { Test } from "@nestjs/testing";
import { MiniGameController } from "./mini-game.controller";
import { MiniGameItemsService } from "./mini-game-items.service";
import { JUSTE_PRIX_ROUND_SECONDS } from "./mini-game-pricing";

describe("MiniGameController", () => {
  let controller: MiniGameController;
  const items = { buildJustePrixItems: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MiniGameController],
      providers: [{ provide: MiniGameItemsService, useValue: items }],
    }).compile();
    controller = module.get(MiniGameController);
  });

  it("draws five rounds by default and returns the rules alongside", async () => {
    items.buildJustePrixItems.mockResolvedValue([{ type: "card", price: 2 }]);

    const result = await controller.getJustePrixItems({});

    expect(items.buildJustePrixItems).toHaveBeenCalledWith(5, undefined);
    expect(result.rules.roundSeconds).toBe(JUSTE_PRIX_ROUND_SECONDS);
    expect(result.items).toEqual([{ type: "card", price: 2 }]);
  });

  it("forwards the requested count and set", async () => {
    items.buildJustePrixItems.mockResolvedValue([]);
    await controller.getJustePrixItems({ count: 3, setId: "sv01" });
    expect(items.buildJustePrixItems).toHaveBeenCalledWith(3, "sv01");
  });
});
