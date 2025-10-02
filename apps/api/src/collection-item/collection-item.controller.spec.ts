import { Test, TestingModule } from '@nestjs/testing';
import { CollectionItemController } from './collection-item.controller';
import { CollectionItemService } from './collection-item.service';

describe('CollectionItemController', () => {
  let controller: CollectionItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionItemController],
      providers: [CollectionItemService],
    }).compile();

    controller = module.get<CollectionItemController>(CollectionItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
