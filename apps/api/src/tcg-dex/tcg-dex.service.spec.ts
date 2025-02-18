import { Test, TestingModule } from '@nestjs/testing';
import { TcgDexService } from './tcg-dex.service';

describe('TcgDexService', () => {
  let service: TcgDexService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TcgDexService],
    }).compile();

    service = module.get<TcgDexService>(TcgDexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
