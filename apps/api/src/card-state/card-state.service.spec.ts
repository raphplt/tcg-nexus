import { Test, TestingModule } from '@nestjs/testing';
import { CardStateService } from './card-state.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CardState } from './entities/card-state.entity';

describe('CardStateService', () => {
  let service: CardStateService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardStateService,
        {
          provide: getRepositoryToken(CardState),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<CardStateService>(CardStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
