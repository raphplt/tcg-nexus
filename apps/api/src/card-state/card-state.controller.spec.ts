import { Test, TestingModule } from '@nestjs/testing';
import { CardStateController } from './card-state.controller';
import { CardStateService } from './card-state.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CardState } from './entities/card-state.entity';

describe('CardStateController', () => {
  let controller: CardStateController;

  const mockCardStateService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardStateController],
      providers: [
        {
          provide: CardStateService,
          useValue: mockCardStateService
        },
        {
          provide: getRepositoryToken(CardState),
          useValue: {}
        }
      ]
    }).compile();

    controller = module.get<CardStateController>(CardStateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
