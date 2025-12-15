import { Test, TestingModule } from '@nestjs/testing';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';

describe('RankingController', () => {
  let controller: RankingController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RankingController],
      providers: [{ provide: RankingService, useValue: service }]
    }).compile();

    controller = module.get<RankingController>(RankingController);
    jest.clearAllMocks();
  });

  it('should delegate to service', async () => {
    service.create.mockReturnValue('created');
    service.findAll.mockReturnValue('all');
    service.findOne.mockReturnValue('one');
    service.update.mockReturnValue('updated');
    service.remove.mockReturnValue('removed');

    expect(await controller.create({} as any)).toBe('created');
    expect(await controller.findAll()).toBe('all');
    expect(await controller.findOne('1')).toBe('one');
    expect(await controller.update('2', {} as any)).toBe('updated');
    expect(await controller.remove('3')).toBe('removed');
  });
});
