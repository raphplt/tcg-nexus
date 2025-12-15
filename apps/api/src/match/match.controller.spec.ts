import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { MatchPhase, MatchStatus } from './entities/match.entity';

describe('MatchController', () => {
  let controller: MatchController;
  let service: jest.Mocked<MatchService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      startMatch: jest.fn(),
      reportScore: jest.fn(),
      resetMatch: jest.fn(),
      getMatchesByRound: jest.fn(),
      getPlayerMatches: jest.fn()
    } as unknown as jest.Mocked<MatchService>;

    controller = new MatchController(service);
  });

  it('should delegate match creation', async () => {
    const dto = { round: 1, phase: MatchPhase.QUALIFICATION } as any;
    service.create.mockResolvedValue('created' as any);

    const result = await controller.create(dto);

    expect(result).toBe('created');
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should list matches', async () => {
    const query = { page: 1, status: MatchStatus.SCHEDULED } as any;
    service.findAll.mockResolvedValue({ data: [] } as any);

    const result = await controller.findAll(query);

    expect(result).toEqual({ data: [] });
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('should return a single match', async () => {
    service.findOne.mockResolvedValue({ id: 42 } as any);

    const result = await controller.findOne(42);

    expect(result).toEqual({ id: 42 });
    expect(service.findOne).toHaveBeenCalledWith(42);
  });

  it('should update a match', async () => {
    const dto = { status: MatchStatus.CANCELLED };
    service.update.mockResolvedValue({
      id: 1,
      status: MatchStatus.CANCELLED
    } as any);

    const result = await controller.update(1, dto as any);

    expect(result.status).toBe(MatchStatus.CANCELLED);
    expect(service.update).toHaveBeenCalledWith(1, dto);
  });

  it('should remove a match', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove(9);

    expect(service.remove).toHaveBeenCalledWith(9);
  });

  it('should start a match', async () => {
    const dto = { notes: 'start' };
    service.startMatch.mockResolvedValue({
      id: 1,
      status: MatchStatus.IN_PROGRESS
    } as any);

    const result = await controller.startMatch(1, dto as any);

    expect(result.status).toBe(MatchStatus.IN_PROGRESS);
    expect(service.startMatch).toHaveBeenCalledWith(1, dto);
  });

  it('should report a score', async () => {
    const dto = { playerAScore: 1, playerBScore: 0 };
    service.reportScore.mockResolvedValue({
      id: 3,
      status: MatchStatus.FINISHED
    } as any);

    const result = await controller.reportScore(3, dto as any);

    expect(result.status).toBe(MatchStatus.FINISHED);
    expect(service.reportScore).toHaveBeenCalledWith(3, dto);
  });

  it('should reset a match', async () => {
    const dto = { reason: 'error' };
    service.resetMatch.mockResolvedValue({
      id: 4,
      status: MatchStatus.SCHEDULED
    } as any);

    const result = await controller.resetMatch(4, dto as any);

    expect(result.status).toBe(MatchStatus.SCHEDULED);
    expect(service.resetMatch).toHaveBeenCalledWith(4, dto);
  });

  it('should get matches by round', async () => {
    service.getMatchesByRound.mockResolvedValue([{ id: 1 }] as any);

    const result = await controller.getMatchesByRound(5, 2);

    expect(result).toEqual([{ id: 1 }]);
    expect(service.getMatchesByRound).toHaveBeenCalledWith(5, 2);
  });

  it('should get player matches', async () => {
    service.getPlayerMatches.mockResolvedValue([{ id: 8 }] as any);

    const result = await controller.getPlayerMatches(7, 6);

    expect(result).toEqual([{ id: 8 }]);
    expect(service.getPlayerMatches).toHaveBeenCalledWith(6, 7);
  });
});
