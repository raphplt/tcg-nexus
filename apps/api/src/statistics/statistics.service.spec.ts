import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let service: StatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatisticsService]
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  it('should return base strings', () => {
    expect(service.create({} as any)).toBe('This action adds a new statistic');
    expect(service.findAll()).toBe('This action returns all statistics');
    expect(service.findOne(1)).toBe('This action returns a #1 statistic');
    expect(service.update(2, {} as any)).toBe(
      'This action updates a #2 statistic'
    );
    expect(service.remove(3)).toBe('This action removes a #3 statistic');
  });
});
