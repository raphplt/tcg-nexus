import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { User } from "../user/entities/user.entity";
import { MatchOnlineController } from "./match-online.controller";
import { MatchOnlineService } from "./online/match-online.service";

describe("MatchOnlineController", () => {
  let controller: MatchOnlineController;
  let service: {
    getDeckEligibility: jest.Mock;
    getSessionView: jest.Mock;
    upsertSession: jest.Mock;
  };

  const mockUser = { id: 10 } as User;
  const mockRequest = { user: mockUser } as unknown as Request;

  beforeEach(async () => {
    service = {
      getDeckEligibility: jest.fn().mockResolvedValue({ eligible: true }),
      getSessionView: jest.fn().mockResolvedValue({ id: 5, state: {} }),
      upsertSession: jest.fn().mockResolvedValue({ id: 5, active: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchOnlineController],
      providers: [{ provide: MatchOnlineService, useValue: service }],
    }).compile();

    controller = module.get<MatchOnlineController>(MatchOnlineController);
  });

  it("delegates getDeckEligibility to matchOnlineService", async () => {
    const result = await controller.getDeckEligibility(5, mockRequest);
    expect(service.getDeckEligibility).toHaveBeenCalledWith(5, mockUser);
    expect(result).toEqual({ eligible: true });
  });

  it("delegates getSessionView to matchOnlineService", async () => {
    const result = await controller.getSessionView(5, mockRequest);
    expect(service.getSessionView).toHaveBeenCalledWith(5, mockUser);
    expect(result).toEqual({ id: 5, state: {} });
  });

  it("delegates upsertSession to matchOnlineService", async () => {
    const result = await controller.upsertSession(5, mockRequest, {
      deckId: 9,
    });
    expect(service.upsertSession).toHaveBeenCalledWith(5, mockUser, 9);
    expect(result).toEqual({ id: 5, active: true });
  });
});
