import {
  Injectable,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { PaginationHelper } from '../helpers/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck } from './entities/deck.entity';
import { DeckCard } from '../deck-card/entities/deck-card.entity';
import { User } from '../user/entities/user.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { DeckFormat } from '../deck-format/entities/deck-format.entity';
import { DeckCardRole } from '../common/enums/deckCardRole';
import { UserRole } from 'src/common/enums/user';
import { DeckShare } from './entities/deck-share.entity';
import { ShareDeckDto } from './dto/share-deck.dto';
import {
  AnalyzeDeckResultDto,
  MissingCardSuggestionDto
} from './dto/analyze-deck-result.dto';
import { PokemonCardsType } from '../common/enums/pokemonCardsType';
export interface FindAllDecksParams {
  formatId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(DeckCard)
    private readonly deckCardRepo: Repository<DeckCard>,
    @InjectRepository(PokemonCard)
    private readonly cardRepo: Repository<PokemonCard>,
    @InjectRepository(DeckFormat)
    private readonly formatRepo: Repository<DeckFormat>,
    @InjectRepository(Deck)
    private readonly decksRepository: Repository<Deck>,
    @InjectRepository(DeckShare)
    private readonly deckShareRepo: Repository<DeckShare>
  ) {}
  async createDeck(user: User, dto: CreateDeckDto) {
    const format = await this.formatRepo.findOneBy({ id: dto.formatId });
    if (!format) throw new NotFoundException('Format introuvable');

    const deck = this.decksRepository.create({
      name: dto.deckName,
      isPublic: dto.isPublic,
      user,
      format,
      coverCard:
        dto.cards.length > 0
          ? (await this.cardRepo.findOneBy({ id: dto.cards[0].cardId })) ||
            undefined
          : undefined
    });

    await this.decksRepository.save(deck);
    // Créer les DeckCards
    const cards: DeckCard[] = [];
    for (const carte of dto.cards) {
      const cardEntity = await this.cardRepo.findOneBy({ id: carte.cardId });
      if (!cardEntity) {
        throw new NotFoundException(`Carte ${carte.cardId} introuvable`);
      }
      const deckCard = this.deckCardRepo.create({
        card: cardEntity,
        qty: carte.qty,
        role: carte.role,
        deck: deck
      });
      cards.push(deckCard);
    }
    // Sauvegarder toutes les cartes
    await this.deckCardRepo.save(cards);
    return await this.decksRepository.findOne({
      where: { id: deck.id },
      relations: ['cards', 'cards.card']
    });
  }

  async findAll(params: FindAllDecksParams = {}) {
    const {
      formatId = 0,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search
    } = params;
    const qb = this.decksRepository
      .createQueryBuilder('deck')
      .leftJoinAndSelect('deck.user', 'user')
      .leftJoinAndSelect('deck.format', 'format')
      .leftJoinAndSelect('deck.coverCard', 'coverCard')
      .leftJoinAndSelect('deck.cards', 'cards')
      .leftJoinAndSelect('cards.card', 'card')
      .andWhere('deck.isPublic = true');
    if (formatId !== 0) {
      qb.andWhere('format.id = :formatId', { formatId });
    }
    if (search) {
      qb.andWhere('LOWER(deck.name) LIKE LOWER(:search)', {
        search: `%${search}%`
      });
    }
    const orderColumn =
      sortBy === 'format.type' ? 'format.type' : `deck.${sortBy}`;
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder
    );
  }

  async findAllFromUser(user: User, params: FindAllDecksParams = {}) {
    const {
      formatId = 0,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search
    } = params;
    const qb = this.decksRepository
      .createQueryBuilder('deck')
      .leftJoinAndSelect('deck.user', 'user')
      .leftJoinAndSelect('deck.format', 'format')
      .leftJoinAndSelect('deck.coverCard', 'coverCard')
      .leftJoinAndSelect('deck.cards', 'cards')
      .leftJoinAndSelect('cards.card', 'card')
      .andWhere('user.id = :userId', { userId: user.id });
    if (formatId !== 0) {
      qb.andWhere('format.id = :formatId', { formatId });
    }
    if (search) {
      qb.andWhere('LOWER(deck.name) LIKE LOWER(:search)', {
        search: `%${search}%`
      });
    }
    const orderColumn =
      sortBy === 'format.type' ? 'format.type' : `deck.${sortBy}`;
    return PaginationHelper.paginateQueryBuilder(
      qb,
      { page, limit },
      orderColumn,
      sortOrder
    );
  }
  async findOneWithCards(id: number): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ['user', 'format', 'cards', 'cards.card']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    return deck;
  }

  async analyzeDeck(id: number): Promise<AnalyzeDeckResultDto> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ['cards', 'cards.card']
    });

    if (!deck) throw new NotFoundException('Deck not found');

    const cards = deck.cards || [];
    const totalCards = cards.reduce((sum, card) => sum + (card.qty || 0), 0);

    const typeMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    const attackCostMap = new Map<number, number>();
    let totalAttackCost = 0;
    let totalAttackCount = 0;

    cards.forEach((deckCard) => {
      const { card, qty } = deckCard;
      const quantity = qty || 0;
      if (!card) return;

      card.types?.forEach((type) =>
        typeMap.set(type, (typeMap.get(type) || 0) + quantity)
      );

      const categoryLabel = card.category || 'Unknown';
      categoryMap.set(
        categoryLabel,
        (categoryMap.get(categoryLabel) || 0) + quantity
      );

      card.attacks?.forEach((attack) => {
        const cost = attack.cost?.length || 0;
        attackCostMap.set(cost, (attackCostMap.get(cost) || 0) + quantity);
        totalAttackCost += cost * quantity;
        totalAttackCount += quantity;
      });
    });

    const typeDistribution = this.mapToDistribution(typeMap, totalCards);
    const categoryDistribution = this.mapToDistribution(
      categoryMap,
      totalCards
    );
    const attackCostDistribution = this.mapCostDistribution(
      attackCostMap,
      totalAttackCount
    );

    const pokemonCount = categoryMap.get(PokemonCardsType.Pokemon) || 0;
    const energyCount = categoryMap.get(PokemonCardsType.Energy) || 0;
    const trainerCount = categoryMap.get(PokemonCardsType.Trainer) || 0;

    const averageEnergyCost = totalAttackCount
      ? parseFloat((totalAttackCost / totalAttackCount).toFixed(2))
      : 0;

    const energyToPokemonRatio = pokemonCount
      ? parseFloat((energyCount / pokemonCount).toFixed(2))
      : 0;

    const duplicates = cards
      .filter(
        (deckCard) =>
          deckCard.qty > 4 &&
          deckCard.card?.category !== PokemonCardsType.Energy
      )
      .map((deckCard) => ({
        cardId: deckCard.card.id,
        cardName: deckCard.card.name || 'Carte inconnue',
        qty: deckCard.qty
      }));

    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (totalCards < 60) {
      warnings.push(`Deck incomplet: ${totalCards}/60 cartes`);
    } else if (totalCards > 60) {
      warnings.push(`Deck trop grand: ${totalCards}/60 cartes`);
    }

    if (duplicates.length) {
      warnings.push(
        'Certaines cartes dépassent la limite autorisée (maximum 4 exemplaires hors énergies).'
      );
    }

    this.evaluateEnergyBalance(
      energyCount,
      pokemonCount,
      totalCards,
      averageEnergyCost,
      warnings,
      suggestions
    );

    if (trainerCount < 10) {
      suggestions.push(
        'Ajoutez des cartes Dresseur pour stabiliser le deck (recommandé: 10+).'
      );
    }

    if (typeDistribution.length > 2) {
      suggestions.push(
        `Deck multi-type détecté (${typeDistribution
          .slice(0, 3)
          .map((d) => d.label)
          .join(', ')}), concentrez-vous sur 1 à 2 types principaux pour plus de constance.`
      );
    } else if (typeDistribution.length === 1 && energyCount > 0) {
      suggestions.push(
        `Renforcez le type ${typeDistribution[0].label} avec des cartes de support compatibles.`
      );
    }

    const missingCards = this.buildMissingCardsSuggestions({
      energyCount,
      pokemonCount,
      trainerCount,
      totalCards,
      typeDistribution,
      averageEnergyCost
    });

    return {
      deckId: deck.id,
      totalCards,
      pokemonCount,
      energyCount,
      trainerCount,
      energyToPokemonRatio,
      averageEnergyCost,
      typeDistribution,
      categoryDistribution,
      attackCostDistribution,
      duplicates,
      warnings,
      suggestions,
      missingCards
    };
  }

  async updateDeck(deckId: number, user: User, dto: UpdateDeckDto) {
    const deck = await this.decksRepository.findOne({
      where: { id: deckId, user: { id: user.id } },
      relations: ['cards']
    });

    if (!deck) throw new NotFoundException('Deck introuvable');

    if (dto.deckName) {
      deck.name = dto.deckName;
    }
    if (dto.isPublic) {
      deck.isPublic = dto.isPublic;
    }
    if (dto.formatId) {
      const format = await this.formatRepo.findOneBy({ id: dto.formatId });
      if (!format) throw new NotFoundException('Format introuvable');
      if (format) {
        deck.format = format;
      }
    }
    await this.decksRepository.save(deck);

    // Supprimer les cartes
    if (dto.cardsToRemove && dto.cardsToRemove.length) {
      await this.deckCardRepo.delete(dto.cardsToRemove.map((c) => c.id));
    }

    if (dto.cardsToAdd.length > 0) {
      const cards: DeckCard[] = [];
      for (const carte of dto.cardsToAdd) {
        const cardEntity = await this.cardRepo.findOneBy({ id: carte.cardId });
        if (!cardEntity) {
          throw new NotFoundException(`Carte ${carte.cardId} introuvable`);
        }
        const deckCard = this.deckCardRepo.create({
          card: cardEntity,
          qty: carte.qty,
          role: carte.role as DeckCardRole,
          deck: deck
        });
        cards.push(deckCard);
      }
      // Sauvegarder toutes les cartes
      await this.deckCardRepo.save(cards);
    }

    if (dto.cardsToUpdate.length > 0) {
      const cards: DeckCard[] = [];
      for (const carte of dto.cardsToUpdate) {
        const cardEntity = await this.deckCardRepo.findOneBy({ id: carte.id });
        if (!cardEntity) {
          throw new NotFoundException(`Carte ${carte.id} introuvable`);
        }
        if (carte.qty) {
          cardEntity.qty = carte.qty;
        }
        if (carte.role) {
          cardEntity.role = carte.role;
        }
        await this.deckCardRepo.save(cardEntity);
      }
      // Sauvegarder toutes les cartes
      await this.deckCardRepo.save(cards);
    }

    return this.decksRepository.findOne({
      where: { id: deck.id },
      relations: ['cards', 'cards.card']
    });
  }

  async remove(id: number) {
    const deck = await this.decksRepository.findOne({ where: { id } });
    if (!deck) throw new NotFoundException(`Deck #${id} not found`);
    await this.decksRepository.remove(deck);
    return { message: `Deck ${deck.name} supprimé avec succès` };
  }
  async cloneDeck(id: number, user: User): Promise<Deck> {
    const deck = await this.decksRepository.findOne({
      where: { id },
      relations: ['user', 'format', 'cards', 'cards.card']
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.user.id !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed to clone this deck');
    }

    const cloned = this.decksRepository.create({
      name: `${deck.name} (copy)`,
      isPublic: deck.isPublic,
      user,
      format: deck.format
    });
    const saved = await this.decksRepository.save(cloned);
    if (deck.cards?.length) {
      const clonedCards = deck.cards.map((dc) =>
        this.deckCardRepo.create({
          deck: { id: saved.id },
          card: { id: dc.card.id },
          qty: dc.qty,
          role: dc.role
        })
      );
      await this.deckCardRepo.save(clonedCards);
    }
    return this.findOneWithCards(saved.id);
  }

  async incrementViews(id: number) {
    await this.decksRepository.increment({ id }, 'views', 1);
    return { message: 'View incremented' };
  }

  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async shareDeck(id: number, user: User, dto?: ShareDeckDto): Promise<{ code: string }> {
    const deck = await this.decksRepository.findOne({
      where: { id, user: { id: user.id } }
    });

    if (!deck) throw new NotFoundException('Deck not found');

    let code = this.generateShareCode();
    let exists = true;
    while (exists) {
      const existing = await this.deckShareRepo.findOneBy({ code });
      if (!existing) {
        exists = false;
      } else {
        code = this.generateShareCode();
      }
    }

    const deckShare = this.deckShareRepo.create({
      deck,
      code,
      expiresAt: dto?.expiresAt ? new Date(dto.expiresAt) : null
    });

    await this.deckShareRepo.save(deckShare);
    return { code };
  }

  async importDeck(code: string, user: User): Promise<Deck> {
    const deckShare = await this.deckShareRepo.findOne({
      where: { code },
      relations: ['deck', 'deck.format', 'deck.cards', 'deck.cards.card']
    });

    if (!deckShare) throw new NotFoundException('Code de partage invalide');

    const now = new Date();
    if (deckShare.expiresAt && deckShare.expiresAt < now) {
      throw new NotFoundException('Ce code de partage a expiré');
    }

    const sourceDeck = deckShare.deck;
    
    const cloned = this.decksRepository.create({
      name: sourceDeck.name,
      isPublic: false,
      user,
      format: sourceDeck.format
    });
    const saved = await this.decksRepository.save(cloned);

    if (sourceDeck.cards?.length) {
      const clonedCards = sourceDeck.cards.map((dc) =>
        this.deckCardRepo.create({
          deck: { id: saved.id },
          card: { id: dc.card.id },
          qty: dc.qty,
          role: dc.role
        })
      );
      await this.deckCardRepo.save(clonedCards);
    }

    return this.findOneWithCards(saved.id);
  }

  async getDeckForImport(code: string): Promise<Deck> {
    const deckShare = await this.deckShareRepo.findOne({
      where: { code },
      relations: ['deck', 'deck.format', 'deck.cards', 'deck.cards.card', 'deck.user']
    });

    if (!deckShare) throw new NotFoundException('Code de partage invalide');

    const now = new Date();
    if (deckShare.expiresAt && deckShare.expiresAt < now) {
      throw new NotFoundException('Ce code de partage a expiré');
    }

    return deckShare.deck;
  }

  private mapToDistribution(
    map: Map<string, number>,
    total: number
  ): { label: string; count: number; percentage: number }[] {
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private mapCostDistribution(
    map: Map<number, number>,
    total: number
  ): { cost: number; count: number; percentage: number }[] {
    return Array.from(map.entries())
      .map(([cost, count]) => ({
        cost,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => a.cost - b.cost);
  }

  private evaluateEnergyBalance(
    energyCount: number,
    pokemonCount: number,
    totalCards: number,
    averageEnergyCost: number,
    warnings: string[],
    suggestions: string[]
  ) {
    if (!totalCards) return;

    const energyRatio = energyCount / totalCards;

    if (energyRatio < 0.25) {
      warnings.push(
        "Pas assez d'énergies pour alimenter les attaques (vise 25-35% du deck)."
      );
      suggestions.push(
        'Ajoutez plusieurs cartes énergie pour sécuriser vos sorties.'
      );
    } else if (energyRatio > 0.45) {
      warnings.push("Beaucoup d'energies detectees, risque de mains mortes.");
      suggestions.push(
        'Réduisez légèrement les énergies au profit de Dresseurs ou Pokémon clés.'
      );
    }

    if (pokemonCount > 0 && energyCount === 0) {
      warnings.push('Aucune énergie détectée alors que des Pokémon sont présents.');
    }

    if (averageEnergyCost > 3 && energyRatio < 0.35) {
      suggestions.push(
        "Les attaques coûtent cher ; ajoutez de l'accélération d'énergie ou augmentez légèrement le nombre d'énergies."
      );
    }
  }

  private buildMissingCardsSuggestions({
    energyCount,
    pokemonCount,
    trainerCount,
    totalCards,
    typeDistribution,
    averageEnergyCost
  }: {
    energyCount: number;
    pokemonCount: number;
    trainerCount: number;
    totalCards: number;
    typeDistribution: { label: string; count: number; percentage: number }[];
    averageEnergyCost: number;
  }): MissingCardSuggestionDto[] {
    const suggestions: MissingCardSuggestionDto[] = [];

    const targetEnergy = Math.max(
      10,
      Math.round(Math.max(totalCards * 0.25, pokemonCount * 0.4))
    );
    if (energyCount < targetEnergy) {
      suggestions.push({
        label: 'Énergies',
        reason:
          "Ajoutez des énergies pour suivre le rythme de vos Pokémon principaux.",
        recommendedQty: targetEnergy - energyCount
      });
    }

    if (trainerCount < 12) {
      suggestions.push({
        label: 'Dresseurs de pioche',
        reason:
          'Renforcez la consistance avec davantage de supporters / dresseurs utilitaires.',
        recommendedQty: 12 - trainerCount
      });
    }

    if (typeDistribution.length) {
      const mainType = typeDistribution[0];
      suggestions.push({
        label: `Support ${mainType.label}`,
        reason: `Ajoutez 1-2 cartes qui profitent spécifiquement au type ${mainType.label}.`,
        recommendedQty: 2
      });
    }

    if (averageEnergyCost >= 3 && energyCount < totalCards * 0.35) {
      suggestions.push({
        label: "Accélération d'énergie",
        reason:
          'Vos coûts moyens sont élevés : prévoyez des cartes qui mettent des énergies en jeu ou réduisent ces coûts.',
        recommendedQty: 2
      });
    }

    const uniqueSuggestions = new Map<string, MissingCardSuggestionDto>();
    suggestions.forEach((entry) => {
      if (!uniqueSuggestions.has(entry.label)) {
        uniqueSuggestions.set(entry.label, entry);
      }
    });

    return Array.from(uniqueSuggestions.values());
  }
}
