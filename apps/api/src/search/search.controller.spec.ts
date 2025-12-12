import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { GlobalSearchDto } from './dto/global-search.dto';

describe('SearchController', () => {
  let controller: SearchController;
  const service = {
    globalSearch: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: service }]
    }).compile();

    controller = module.get<SearchController>(SearchController);
    jest.clearAllMocks();
  });

  it('should trigger global search', async () => {
    service.globalSearch.mockResolvedValue({ items: [] });
    const dto = new GlobalSearchDto();
    dto.query = 'pikachu';
    await expect(controller.globalSearch(dto)).resolves.toEqual({ items: [] });
  });
});
