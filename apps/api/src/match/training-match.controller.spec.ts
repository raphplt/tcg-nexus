import { TrainingDifficulty } from "./entities/training-match-session.entity";
import { TrainingMatchController } from "./training-match.controller";
import { TrainingMatchService } from "./training/training-match.service";

describe("TrainingMatchController", () => {
  let controller: TrainingMatchController;
  let service: jest.Mocked<TrainingMatchService>;

  beforeEach(() => {
    service = {
      getLobby: jest.fn(),
      createSession: jest.fn(),
      getSessionView: jest.fn(),
      dispatchAction: jest.fn(),
      respondPrompt: jest.fn(),
    } as unknown as jest.Mocked<TrainingMatchService>;

    controller = new TrainingMatchController(service);
  });

  it("should return the training lobby", async () => {
    service.getLobby.mockResolvedValue({ activeSessions: [] } as any);

    const result = await controller.getLobby({ id: 5 } as any);

    expect(result).toEqual({ activeSessions: [] });
    expect(service.getLobby).toHaveBeenCalledWith({ id: 5 });
  });

  it("should create a training session", async () => {
    service.createSession.mockResolvedValue({ sessionId: 41 } as any);

    const result = await controller.createSession({ id: 5 } as any, {
      deckId: 9,
      aiDeckPresetId: "mvp-blaziken-lite",
      difficulty: TrainingDifficulty.EASY,
    });

    expect(result).toEqual({ sessionId: 41 });
    expect(service.createSession).toHaveBeenCalled();
  });

  it("should delegate action dispatch", async () => {
    service.dispatchAction.mockResolvedValue({ events: [] } as any);

    const result = await controller.dispatchAction(12, { id: 5 } as any, {
      action: {
        type: "END_TURN" as any,
      },
    });

    expect(result).toEqual({ events: [] });
    expect(service.dispatchAction).toHaveBeenCalledWith(
      12,
      { id: 5 },
      { type: "END_TURN" },
    );
  });
});
