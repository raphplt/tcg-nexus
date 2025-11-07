import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from './marketplace.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from './entities/listing.entity';
import { PriceHistory } from './entities/price-history.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { Order } from './entities/order.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../common/enums/user';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let repo: jest.Mocked<Repository<Listing>>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<Repository<Listing>>> = {
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    };

    const priceHistoryRepoMock: Partial<jest.Mocked<Repository<PriceHistory>>> =
      {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn()
      };

    const pokemonCardRepoMock: Partial<jest.Mocked<Repository<PokemonCard>>> = {
      findOne: jest.fn()
    };

    const orderRepoMock: Partial<jest.Mocked<Repository<Order>>> = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: getRepositoryToken(Listing), useValue: repoMock },
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: priceHistoryRepoMock
        },
        {
          provide: getRepositoryToken(PokemonCard),
          useValue: pokemonCardRepoMock
        },
        { provide: getRepositoryToken(Order), useValue: orderRepoMock }
      ]
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    repo = module.get(getRepositoryToken(Listing));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update ownership', () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it('throws NotFound if listing missing', async () => {
      repo.findOne.mockResolvedValue(null as any);
      await expect(
        service.update(10, { price: 100 } as any, owner)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids non-owner non-admin', async () => {
      repo.findOne.mockResolvedValue(listing as any);
      await expect(
        service.update(10, { price: 100 } as any, other)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows owner', async () => {
      repo.findOne.mockResolvedValue({ ...listing } as any);
      repo.save.mockImplementation(async (l: any) => l);
      const res = await service.update(10, { price: 200 } as any, owner);
      expect(res).toBeDefined();
      expect(repo.save).toHaveBeenCalled();
    });

    it('allows admin', async () => {
      repo.findOne.mockResolvedValue({ ...listing } as any);
      repo.save.mockImplementation(async (l: any) => l);
      const res = await service.update(10, { price: 300 } as any, admin);
      expect(res).toBeDefined();
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('delete ownership', () => {
    const owner: User = { id: 1, role: UserRole.USER } as any;
    const other: User = { id: 2, role: UserRole.USER } as any;
    const admin: User = { id: 3, role: UserRole.ADMIN } as any;
    const listing: Partial<Listing> = { id: 10, seller: { id: 1 } as any };

    it('throws NotFound if listing missing', async () => {
      repo.findOne.mockResolvedValue(null as any);
      await expect(service.delete(10, owner)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('forbids non-owner non-admin', async () => {
      repo.findOne.mockResolvedValue(listing as any);
      await expect(service.delete(10, other)).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('allows owner', async () => {
      repo.findOne.mockResolvedValue({ ...listing } as any);
      await service.delete(10, owner);
      expect(repo.delete).toHaveBeenCalledWith(10);
    });

    it('allows admin', async () => {
      repo.findOne.mockResolvedValue({ ...listing } as any);
      await service.delete(10, admin);
      expect(repo.delete).toHaveBeenCalledWith(10);
    });
  });
});
