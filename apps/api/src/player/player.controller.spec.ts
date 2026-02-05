import { Test, TestingModule } from '@nestjs/testing';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';

describe('PlayerController', () => {
  let controller: PlayerController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getTournamentHistory: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [{ provide: PlayerService, useValue: service }]
    }).compile();

    controller = module.get<PlayerController>(PlayerController);
    jest.clearAllMocks();
  });

  it('should delegate to service', async () => {
    service.create.mockReturnValue('created');
    service.findAll.mockReturnValue('all');
    service.findOne.mockReturnValue('one');
    service.update.mockReturnValue('updated');
    service.remove.mockReturnValue('removed');
    service.getTournamentHistory.mockReturnValue('history');

    expect(await controller.create({} as any)).toBe('created');
    expect(await controller.findAll()).toBe('all');
    expect(await controller.findOne(1 as any)).toBe('one');
    expect(await controller.getTournamentHistory(1 as any, 'all')).toBe(
      'history'
    );
    expect(await controller.update(1 as any, {} as any)).toBe('updated');
    expect(await controller.remove(1 as any)).toBe('removed');
  });
});
