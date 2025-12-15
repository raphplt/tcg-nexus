import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Article } from './entities/article.entity';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
  let service: ArticleService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: repo
        }
      ]
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    jest.clearAllMocks();
  });

  it('should create and save article', async () => {
    repo.create.mockReturnValue({ id: 1 });
    repo.save.mockResolvedValue({ id: 1 });
    await expect(service.create({ title: 'a' } as any)).resolves.toEqual({
      id: 1
    });
  });

  it('should find all ordered', async () => {
    repo.find.mockResolvedValue([{ id: 1 }]);
    await expect(service.findAll()).resolves.toEqual([{ id: 1 }]);
    expect(repo.find).toHaveBeenCalled();
  });

  it('should find one, update and delete', async () => {
    repo.findOneBy.mockResolvedValue({ id: 2 });
    await expect(service.findOne(2)).resolves.toEqual({ id: 2 });
    repo.update.mockResolvedValue({ affected: 1 });
    await expect(service.update(3, { title: 'b' } as any)).resolves.toEqual({
      affected: 1
    });
    repo.delete.mockResolvedValue({ affected: 1 });
    await expect(service.remove(4)).resolves.toEqual({ affected: 1 });
  });
});
