import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionItem } from './entities/collection-item.entity';
import { Collection } from 'src/collection/entities/collection.entity';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';
import { User } from 'src/user/entities/user.entity';
import { CardState } from 'src/card-state/entities/card-state.entity';

@Injectable()
export class CollectionItemService {
  constructor(
    @InjectRepository(CollectionItem)
    private readonly collectionItemRepo: Repository<CollectionItem>,

    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,

    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepo: Repository<PokemonCard>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(CardState)
    private readonly cardStateRepo: Repository<CardState>
  ) {}

  /**
   * Ajouter une carte Pokémon dans la wishlist d'un user
   */
  async addToWishlist(
    userId: number | string,
    pokemonCardId: string
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === 'string' ? Number(userId) : userId;

    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId }
    });
    if (!card) throw new NotFoundException('Carte Pokémon non trouvée');
    console.log('userIdNum:', userIdNum);
    let wishlist = await this.collectionRepo
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.items', 'item')
      .leftJoinAndSelect('item.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('collection.user', 'user')
      .where('collection.name = :name', { name: 'wishlist' })
      .andWhere('user.id = :userId', { userId: userIdNum })
      .getOne();

    console.log('Wishlist found:', wishlist);
    if (!wishlist) {
      wishlist = this.collectionRepo.create({
        name: 'wishlist',
        user,
        is_public: false
      });
      wishlist = await this.collectionRepo.save(wishlist);
    }

    let item = wishlist.items?.find((i) => i.pokemonCard.id === card.id);

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    item = this.collectionItemRepo.create({
      collection: wishlist,
      pokemonCard: card,
      cardState: { id: 1 } as CardState,
      quantity: 1
    });

    return this.collectionItemRepo.save(item);
  }

  async addToFavorites(
    userId: number | string,
    pokemonCardId: string
  ): Promise<CollectionItem> {
    const userIdNum = typeof userId === 'string' ? Number(userId) : userId;

    const user = await this.userRepo.findOne({ where: { id: userIdNum } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const card = await this.pokemonCardRepo.findOne({
      where: { id: pokemonCardId }
    });
    if (!card) throw new NotFoundException('Carte Pokémon non trouvée');
    console.log('userIdNum:', userIdNum);
    let favoris = await this.collectionRepo
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.items', 'item')
      .leftJoinAndSelect('item.pokemonCard', 'pokemonCard')
      .leftJoinAndSelect('collection.user', 'user')
      .where('collection.name = :name', { name: 'Favoris' })
      .andWhere('user.id = :userId', { userId: userIdNum })
      .getOne();

    console.log('Favoris found:', favoris);
    if (!favoris) {
      favoris = this.collectionRepo.create({
        name: 'Favoris',
        user,
        is_public: false
      });
      favoris = await this.collectionRepo.save(favoris);
    }

    let item = favoris.items?.find((i) => i.pokemonCard.id === card.id);

    if (item) {
      item.quantity += 1;
      return this.collectionItemRepo.save(item);
    }

    item = this.collectionItemRepo.create({
      collection: favoris,
      pokemonCard: card,
      cardState: { id: 1 } as CardState,
      quantity: 1
    });

    return this.collectionItemRepo.save(item);
  }
}
