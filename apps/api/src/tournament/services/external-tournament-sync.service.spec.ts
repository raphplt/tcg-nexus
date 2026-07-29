import { ExternalTournamentSyncService } from "./external-tournament-sync.service";

describe("ExternalTournamentSyncService", () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  let service: ExternalTournamentSyncService;
  let originalUrl: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalUrl = process.env.EXTERNAL_TOURNAMENT_API_URL;
    delete process.env.EXTERNAL_TOURNAMENT_API_URL;
    service = new ExternalTournamentSyncService(repository as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined) {
      delete process.env.EXTERNAL_TOURNAMENT_API_URL;
    } else {
      process.env.EXTERNAL_TOURNAMENT_API_URL = originalUrl;
    }
  });

  it("does not import fallback data when no provider is configured", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");

    await service.syncExternalTournaments();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("does not persist data when the provider fails", async () => {
    process.env.EXTERNAL_TOURNAMENT_API_URL = "https://provider.test/events";
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await service.syncExternalTournaments();

    expect(repository.save).not.toHaveBeenCalled();
  });

  it("imports a valid provider event", async () => {
    process.env.EXTERNAL_TOURNAMENT_API_URL = "https://provider.test/events";
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          name: "Provider Cup",
          startDate: "2027-01-10T10:00:00.000Z",
          endDate: "2027-01-10T18:00:00.000Z",
        },
      ]),
    } as unknown as Response);
    repository.findOne.mockResolvedValue(null);
    repository.save.mockImplementation((value) => value);

    await service.syncExternalTournaments();

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Provider Cup",
        isExternal: true,
        isPublic: true,
      }),
    );
  });
});
