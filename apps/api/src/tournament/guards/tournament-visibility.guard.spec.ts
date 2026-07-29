import { ExecutionContext, NotFoundException } from "@nestjs/common";
import { UserRole } from "src/common/enums/user";
import { TournamentVisibilityGuard } from "./tournament-visibility.guard";

const createContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

describe("TournamentVisibilityGuard", () => {
  const tournamentRepository = { findOne: jest.fn() };
  const organizerRepository = { findOne: jest.fn() };
  let guard: TournamentVisibilityGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new TournamentVisibilityGuard(
      tournamentRepository as any,
      organizerRepository as any,
    );
  });

  it("allows access to a public tournament", async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 12,
      isPublic: true,
    });

    await expect(
      guard.canActivate(createContext({ params: { id: "12" } })),
    ).resolves.toBe(true);
    expect(organizerRepository.findOne).not.toHaveBeenCalled();
  });

  it("hides a private tournament from anonymous users", async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 12,
      isPublic: false,
    });

    await expect(
      guard.canActivate(createContext({ params: { id: "12" } })),
    ).rejects.toThrow(NotFoundException);
  });

  it("allows an active organizer to view a private tournament", async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 12,
      isPublic: false,
    });
    organizerRepository.findOne.mockResolvedValue({ id: 3 });

    await expect(
      guard.canActivate(
        createContext({
          params: { id: "12" },
          user: { id: 7, role: UserRole.USER },
        }),
      ),
    ).resolves.toBe(true);
  });

  it("hides a private tournament from unrelated users", async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 12,
      isPublic: false,
    });
    organizerRepository.findOne.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({
          params: { id: "12" },
          user: { id: 7, role: UserRole.USER },
        }),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
