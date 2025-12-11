import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
  let service: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticleService]
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  it('should return base strings', () => {
    expect(service.create({} as any)).toBe('This action adds a new article');
    expect(service.findAll()).toBe('This action returns all article');
    expect(service.findOne(1)).toBe('This action returns a #1 article');
    expect(service.update(2, {} as any)).toBe(
      'This action updates a #2 article'
    );
    expect(service.remove(3)).toBe('This action removes a #3 article');
  });
});
