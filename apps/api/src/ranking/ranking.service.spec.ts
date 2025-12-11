import { Test, TestingModule } from '@nestjs/testing';
import { RankingService } from './ranking.service';

describe('RankingService', () => {
  let service: RankingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RankingService]
    }).compile();

    service = module.get<RankingService>(RankingService);
  });

  it('should return base strings', () => {
    expect(service.create({} as any)).toBe('This action adds a new ranking');
    expect(service.findAll()).toBe('This action returns all ranking');
    expect(service.findOne(1)).toBe('This action returns a #1 ranking');
    expect(service.update(2, {} as any)).toBe('This action updates a #2 ranking');
    expect(service.remove(3)).toBe('This action removes a #3 ranking');
  });
});
