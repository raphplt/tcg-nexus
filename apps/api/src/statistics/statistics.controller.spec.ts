import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [{ provide: StatisticsService, useValue: service }]
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
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
