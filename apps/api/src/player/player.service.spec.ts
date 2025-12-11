import { Test, TestingModule } from '@nestjs/testing';
import { PlayerService } from './player.service';

describe('PlayerService', () => {
  let service: PlayerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayerService]
    }).compile();

    service = module.get<PlayerService>(PlayerService);
  });

  it('should return base strings', () => {
    expect(service.create({} as any)).toBe('This action adds a new player');
    expect(service.findAll()).toBe('This action returns all player');
    expect(service.findOne(1)).toBe('This action returns a #1 player');
    expect(service.update(2, {} as any)).toBe('This action updates a #2 player');
    expect(service.remove(3)).toBe('This action removes a #3 player');
  });
});
