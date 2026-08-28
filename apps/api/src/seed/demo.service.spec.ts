import { DemoService } from "./demo.service";

describe("DemoService", () => {
  let service: DemoService;
  let mockUserRepo: any;
  let mockPlayerRepo: any;
  let mockTournamentRepo: any;
  let mockRegistrationRepo: any;
  let mockOrganizerRepo: any;
  let mockMatchRepo: any;
  let mockDeckRepo: any;
  let mockArticleRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: jest
        .fn()
        .mockImplementation((user) =>
          Promise.resolve({ id: user.id || 1, ...user }),
        ),
    };
    mockPlayerRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 10, ...dto })),
      save: jest.fn().mockResolvedValue({ id: 10 }),
    };
    mockTournamentRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 100, ...dto })),
      save: jest
        .fn()
        .mockImplementation((tourn) => Promise.resolve({ id: 100, ...tourn })),
    };
    mockRegistrationRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 200, ...dto })),
      save: jest.fn().mockResolvedValue({ id: 200 }),
    };
    mockOrganizerRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 300, ...dto })),
      save: jest.fn().mockResolvedValue({ id: 300 }),
    };
    mockMatchRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 4 }),
      find: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
      remove: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => ({ id: 400, ...dto })),
      save: jest.fn().mockResolvedValue({ id: 400 }),
    };
    mockDeckRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 500, ...dto })),
      save: jest.fn().mockResolvedValue({ id: 500 }),
    };
    mockArticleRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 600, ...dto })),
      save: jest
        .fn()
        .mockImplementation((art) => Promise.resolve({ id: 600, ...art })),
    };

    service = new DemoService(
      mockUserRepo,
      mockPlayerRepo,
      mockTournamentRepo,
      mockRegistrationRepo,
      mockOrganizerRepo,
      mockMatchRepo,
      mockDeckRepo,
      mockArticleRepo,
    );
  });

  it("should prepare demo data idempotently without throwing", async () => {
    const report = await service.prepareDemo();
    expect(report).toBeDefined();
    expect(report.users.length).toBeGreaterThanOrEqual(4);
    expect(report.tournament.name).toBe(DemoService.DEMO_TOURNAMENT_NAME);
    expect(report.articles.length).toBe(3);
  });

  it("should reset demo tournament matches targetedly", async () => {
    mockTournamentRepo.findOne.mockResolvedValue({
      id: 100,
      name: DemoService.DEMO_TOURNAMENT_NAME,
      registrations: Array.from({ length: 8 }, (_, i) => ({
        status: "confirmed",
        player: { id: i + 1 },
      })),
    });

    const result = await service.resetDemoTournament();
    expect(result.success).toBe(true);
    expect(result.tournamentId).toBe(100);
    expect(mockMatchRepo.remove).toHaveBeenCalled();
  });
});
