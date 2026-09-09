import { Test, TestingModule } from "@nestjs/testing";
import { User } from "../user/entities/user.entity";
import { CasualMatchController } from "./casual-match.controller";
import { CasualMatchService } from "./casual/casual-match.service";
import { MatchmakingService } from "./casual/matchmaking.service";

describe("CasualMatchController", () => {
  let controller: CasualMatchController;
  let casualMatchService: {
    getLobby: jest.Mock;
    getSessionView: jest.Mock;
    selectDeck: jest.Mock;
    dispatchAction: jest.Mock;
    respondPrompt: jest.Mock;
  };
  let matchmakingService: {
    isQueued: jest.Mock;
  };

  const mockUser = { id: 42 } as User;

  beforeEach(async () => {
    casualMatchService = {
      getLobby: jest.fn().mockResolvedValue({ sessions: [], decks: [] }),
      getSessionView: jest.fn().mockResolvedValue({ id: 10, state: {} }),
      selectDeck: jest.fn().mockResolvedValue({ success: true }),
      dispatchAction: jest.fn().mockResolvedValue({ success: true }),
      respondPrompt: jest.fn().mockResolvedValue({ success: true }),
    };

    matchmakingService = {
      isQueued: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CasualMatchController],
      providers: [
        { provide: CasualMatchService, useValue: casualMatchService },
        { provide: MatchmakingService, useValue: matchmakingService },
      ],
    }).compile();

    controller = module.get<CasualMatchController>(CasualMatchController);
  });

  it("returns lobby with queueStatus idle when not queued", async () => {
    const result = await controller.getLobby(mockUser);
    expect(casualMatchService.getLobby).toHaveBeenCalledWith(mockUser);
    expect(matchmakingService.isQueued).toHaveBeenCalledWith(42);
    expect(result.queueStatus).toBe("idle");
  });

  it("returns lobby with queueStatus queued when queued", async () => {
    matchmakingService.isQueued.mockReturnValueOnce(true);

    const result = await controller.getLobby(mockUser);
    expect(result.queueStatus).toBe("queued");
  });

  it("delegates getSessionView to casualMatchService", async () => {
    const result = await controller.getSessionView(10, mockUser);
    expect(casualMatchService.getSessionView).toHaveBeenCalledWith(
      10,
      mockUser,
    );
    expect(result).toEqual({ id: 10, state: {} });
  });

  it("delegates selectDeck to casualMatchService", async () => {
    await controller.selectDeck(10, mockUser, { deckId: 1 });
    expect(casualMatchService.selectDeck).toHaveBeenCalledWith(10, mockUser, 1);
  });

  it("delegates dispatchAction to casualMatchService", async () => {
    const action = { type: "attack", attackIndex: 0 } as any;
    await controller.dispatchAction(10, mockUser, { action });
    expect(casualMatchService.dispatchAction).toHaveBeenCalledWith(
      10,
      mockUser,
      action,
    );
  });

  it("delegates respondPrompt to casualMatchService", async () => {
    const response = { choice: 1 } as any;
    await controller.respondPrompt(10, mockUser, { response });
    expect(casualMatchService.respondPrompt).toHaveBeenCalledWith(
      10,
      mockUser,
      response,
    );
  });
});
