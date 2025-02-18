import { Test, TestingModule } from '@nestjs/testing';
import { TcgDexController } from './tcg-dex.controller';
import { TcgDexService } from './tcg-dex.service';

describe('TcgDexController', () => {
  let controller: TcgDexController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TcgDexController],
      providers: [TcgDexService],
    }).compile();

    controller = module.get<TcgDexController>(TcgDexController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
