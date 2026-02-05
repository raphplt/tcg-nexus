import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from 'src/card/entities/card.entity';
import { PokemonCardDetails } from 'src/card/entities/pokemon-card-details.entity';
import { CreatePokemonCardDto } from './dto/create-pokemon-card.dto';
import { UpdatePokemonCardDto } from './dto/update-pokemon-card.dto';
import { PaginationHelper, PaginatedResult } from '../helpers/pagination';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import { CardGame } from 'src/common/enums/cardGame';

@Injectable()
export class PokemonCardService {
  constructor(
    @InjectRepository(Card)
    private readonly pokemonCardRepository: Repository<Card>,
    @InjectRepository(PokemonCardDetails)
    private readonly pokemonCardDetailsRepository: Repository<PokemonCardDetails>
  ) {}

  private toPokemonCardResponse(card: Card) {
    const details = card.pokemonDetails;
    return {
      id: card.id,
      tcgDexId: card.tcgDexId,
      localId: card.localId,
      name: card.name,
      image: card.image,
      category: details?.category ?? card.category,
      illustrator: card.illustrator,
      rarity: card.rarity,
      variants: card.variants,
      variantsDetailed: card.variantsDetailed,
      set: card.set,
      legal: card.legal,
      updated: card.updated,
      pricing: card.pricing,
      dexId: details?.dexId,
      hp: details?.hp,
      types: details?.types,
      evolveFrom: details?.evolveFrom,
      description: details?.description,
      effect: details?.effect,
      level: details?.level,
      stage: details?.stage,
      suffix: details?.suffix,
      item: details?.item,
      abilities: details?.abilities,
      attacks: details?.attacks,
      weaknesses: details?.weaknesses,
      resistances: details?.resistances,
      retreat: details?.retreat,
      regulationMark: details?.regulationMark,
      trainerType: details?.trainerType,
      energyType: details?.energyType,
      boosters: details?.boosters
    };
  }

  private async findOneEntity(id: string): Promise<Card> {
    const card = await this.pokemonCardRepository.findOne({
      where: { id, game: CardGame.Pokemon },
      relations: ['set', 'pokemonDetails']
    });
    if (!card) {
      throw new Error(`Card with id ${id} not found`);
    }
    return card;
  }

  async create(
    createPokemonCardDto: CreatePokemonCardDto
  ): Promise<Record<string, any>> {
    const {
      set,
      setId,
      category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters,
      ...baseFields
    } = createPokemonCardDto;

    const newCard = this.pokemonCardRepository.create({
      ...baseFields,
      game: CardGame.Pokemon,
      category,
      set: set?.id
        ? ({ id: set.id } as PokemonSet)
        : setId
          ? ({ id: setId } as PokemonSet)
          : undefined
    });

    const details = this.pokemonCardDetailsRepository.create({
      category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters
    });

    details.card = newCard;
    newCard.pokemonDetails = details;
    const savedCard = await this.pokemonCardRepository.save(newCard);
    return this.toPokemonCardResponse(savedCard);
  }

  async findAll(): Promise<Record<string, any>[]> {
    const cards = await this.pokemonCardRepository.find({
      where: { game: CardGame.Pokemon },
      relations: ['set', 'pokemonDetails']
    });
    return cards.map((card) => this.toPokemonCardResponse(card));
  }

  async findOne(id: string): Promise<Record<string, any>> {
    const card = await this.findOneEntity(id);
    return this.toPokemonCardResponse(card);
  }

  async findBySearch(search: string): Promise<Record<string, any>[]> {
    const qb = this.pokemonCardRepository
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.set', 'set')
      .leftJoinAndSelect('card.pokemonDetails', 'pokemonDetails')
      .where('card.game = :game', { game: CardGame.Pokemon });

    if (!search) {
      return [];
    }

    qb.andWhere(
      '(card.name ILIKE :search OR card.rarity ILIKE :search OR set.name ILIKE :search OR pokemonDetails.description ILIKE :search)',
      { search: `%${search}%` }
    );

    const cards = await qb.getMany();
    return cards.map((card) => this.toPokemonCardResponse(card));
  }

  async update(
    id: string,
    updatePokemonCardDto: UpdatePokemonCardDto
  ): Promise<Record<string, any>> {
    const card = await this.findOneEntity(id);
    // Associer un set via son id si fourni
    const {
      set,
      setId,
      category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters,
      ...baseFields
    } = updatePokemonCardDto;

    if (updatePokemonCardDto.set?.id) {
      card.set = { id: updatePokemonCardDto.set.id } as PokemonSet;
    } else if (setId) {
      card.set = { id: setId } as PokemonSet;
    }

    this.pokemonCardRepository.merge(card, {
      ...baseFields,
      category: category ?? card.category,
      set: card.set
    });

    if (!card.pokemonDetails) {
      card.pokemonDetails = this.pokemonCardDetailsRepository.create({
        card
      });
    }

    Object.assign(card.pokemonDetails, {
      category: category ?? card.pokemonDetails.category,
      dexId,
      hp,
      types,
      evolveFrom,
      description,
      effect,
      level,
      stage,
      suffix,
      item,
      abilities,
      attacks,
      weaknesses,
      resistances,
      retreat,
      regulationMark,
      trainerType,
      energyType,
      boosters
    });
    const savedCard = await this.pokemonCardRepository.save(card);
    return this.toPokemonCardResponse(savedCard);
  }

  async remove(id: string): Promise<void> {
    await this.pokemonCardRepository.delete(id);
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResult<Record<string, any>>> {
    const { page: validPage, limit: validLimit } =
      PaginationHelper.validateParams({
        page,
        limit
      });

    const offset = PaginationHelper.calculateOffset(validPage, validLimit);

    const [data, totalItems] = await this.pokemonCardRepository.findAndCount({
      relations: ['set', 'pokemonDetails'],
      where: { game: CardGame.Pokemon },
      skip: offset,
      take: validLimit,
      order: { name: 'ASC' }
    });

    return PaginationHelper.createPaginatedResult(
      data.map((card) => this.toPokemonCardResponse(card)),
      totalItems,
      validPage,
      validLimit
    );
  }

  // async findRandom(): Promise<Card> {
  //   const count = await this.pokemonCardRepository.count();
  //   const randomIndex = Math.floor(Math.random() * count);
  //   const randomCard = await this.pokemonCardRepository.find({
  //     skip: randomIndex,
  //     take: 1
  //   });
  //   return randomCard[0];
  // }

  // pokemon-card.service.ts

  async findRandom(
    serieId?: string,
    rarity?: string,
    setId?: string
  ): Promise<Record<string, any> | null> {
    const qb = this.pokemonCardRepository
      .createQueryBuilder('pokemonCard')
      .leftJoinAndSelect('pokemonCard.set', 'pokemonSet')
      .leftJoin('pokemonSet.serie', 'pokemonSerie')
      .leftJoinAndSelect('pokemonCard.pokemonDetails', 'pokemonDetails')
      .where('pokemonCard.game = :game', { game: CardGame.Pokemon });

    if (serieId && serieId.trim() !== '') {
      qb.andWhere('pokemonSerie.id = :serieId', { serieId });
    }

    if (rarity && rarity.trim() !== '') {
      qb.andWhere('pokemonCard.rarity = :rarity', { rarity });
    }

    if (setId && setId.trim() !== '') {
      qb.andWhere('pokemonSet.id = :setId', { setId });
    }

    const card = await qb.orderBy('RANDOM()').limit(1).getOne();
    return card ? this.toPokemonCardResponse(card) : null;
  }
}
