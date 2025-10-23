import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyzeDeckDto } from './dto/analyze-deck.dto';
import { DeckAnalysisResponseDto } from './dto/analyze-deck-response.dto';
import { Deck } from '../deck/entities/deck.entity';
import { PokemonCard } from '../pokemon-card/entities/pokemon-card.entity';
import { PokemonCardsType } from '../common/enums/pokemonCardsType';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Deck)
    private readonly deckRepo: Repository<Deck>,
    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepo: Repository<PokemonCard>
  ) {}

  async analyzeDeck(dto: AnalyzeDeckDto): Promise<DeckAnalysisResponseDto> {
    let cards: { card: PokemonCard; qty: number }[] = [];
    let deckId: number | undefined;

    if (dto.deckId) {
      // Analyser un deck existant
      const deck = await this.deckRepo.findOne({
        where: { id: dto.deckId },
        relations: ['cards', 'cards.card']
      });

      if (!deck) {
        throw new NotFoundException('Deck not found');
      }

      deckId = deck.id;
      cards = deck.cards?.map((dc) => ({ card: dc.card, qty: dc.qty })) || [];
    } else if (dto.cardIds && dto.cardIds.length > 0) {
      // Analyser une liste de cartes
      const pokemonCards = await this.pokemonCardRepo.findByIds(dto.cardIds);

      if (pokemonCards.length === 0) {
        throw new BadRequestException('No cards found');
      }

      // Compter les cartes
      const cardCount = new Map<string, number>();
      dto.cardIds.forEach((id) => {
        cardCount.set(id, (cardCount.get(id) || 0) + 1);
      });

      cards = pokemonCards.map((card) => ({
        card,
        qty: cardCount.get(card.id) || 1
      }));
    } else {
      throw new BadRequestException(
        'Either deckId or cardIds must be provided'
      );
    }

    return this.performAnalysis(cards, deckId);
  }

  private performAnalysis(
    cards: { card: PokemonCard; qty: number }[],
    deckId?: number
  ): DeckAnalysisResponseDto {
    const totalCards = cards.reduce((sum, c) => sum + c.qty, 0);

    // Distribution des types
    const typeMap = new Map<string, number>();
    cards.forEach(({ card, qty }) => {
      if (card.types && card.types.length > 0) {
        card.types.forEach((type) => {
          typeMap.set(type, (typeMap.get(type) || 0) + qty);
        });
      }
    });

    const typeDistribution = Array.from(typeMap.entries()).map(
      ([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalCards) * 100)
      })
    );

    // Distribution des catégories (Pokémon, Trainer, Energy)
    const categoryMap = new Map<string, number>();
    cards.forEach(({ card, qty }) => {
      const category = card.category || 'Unknown';
      categoryMap.set(category, (categoryMap.get(category) || 0) + qty);
    });

    const categoryDistribution = Array.from(categoryMap.entries()).map(
      ([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalCards) * 100)
      })
    );

    // Distribution des coûts d'énergie (pour les attaques)
    const costMap = new Map<number, number>();
    cards.forEach(({ card, qty }) => {
      if (card.attacks && card.attacks.length > 0) {
        card.attacks.forEach((attack) => {
          const cost = attack.cost?.length || 0;
          costMap.set(cost, (costMap.get(cost) || 0) + qty);
        });
      }
    });

    const energyCostDistribution = Array.from(costMap.entries())
      .map(([cost, count]) => ({
        cost,
        count,
        percentage: Math.round((count / totalCards) * 100)
      }))
      .sort((a, b) => a.cost - b.cost);

    // Détection des doublons
    const duplicates = cards
      .filter((c) => c.qty > 1)
      .map((c) => ({
        cardId: c.card.id,
        cardName: c.card.name || 'Unknown',
        count: c.qty
      }));

    // Détection de synergies simples
    const synergies = this.detectSynergies(cards);

    // Warnings et recommandations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (totalCards < 60) {
      warnings.push(`Deck incomplet: ${totalCards}/60 cartes`);
    } else if (totalCards > 60) {
      warnings.push(`Deck trop grand: ${totalCards}/60 cartes`);
    }

    const energyCount = categoryMap.get(PokemonCardsType.Energy) || 0;
    const energyPercentage = (energyCount / totalCards) * 100;

    if (energyPercentage < 30) {
      recommendations.push(
        'Considérez ajouter plus de cartes énergie (recommandé: 30-40%)'
      );
    } else if (energyPercentage > 50) {
      recommendations.push(
        'Trop de cartes énergie, considérez en retirer quelques-unes'
      );
    }

    const trainerCount = categoryMap.get(PokemonCardsType.Trainer) || 0;
    if (trainerCount < 10) {
      recommendations.push(
        'Ajoutez plus de cartes Trainer pour améliorer la consistance du deck'
      );
    }

    return {
      deckId,
      totalCards,
      typeDistribution,
      categoryDistribution,
      energyCostDistribution,
      duplicates,
      synergies,
      warnings,
      recommendations
    };
  }

  private detectSynergies(
    cards: { card: PokemonCard; qty: number }[]
  ): DeckAnalysisResponseDto['synergies'] {
    const synergies: DeckAnalysisResponseDto['synergies'] = [];

    // Synergie de type d'énergie
    const typeGroups = new Map<string, string[]>();
    cards.forEach(({ card }) => {
      if (card.types && card.types.length > 0) {
        card.types.forEach((type) => {
          if (!typeGroups.has(type)) {
            typeGroups.set(type, []);
          }
          typeGroups.get(type)!.push(card.id);
        });
      }
    });

    typeGroups.forEach((cardIds, type) => {
      if (cardIds.length >= 3) {
        synergies.push({
          type: 'energy-type',
          description: `${cardIds.length} cartes de type ${type} détectées`,
          cardIds
        });
      }
    });

    // Synergie d'évolution
    const evolutionChains = new Map<string, string[]>();
    cards.forEach(({ card }) => {
      if (card.evolveFrom) {
        if (!evolutionChains.has(card.evolveFrom)) {
          evolutionChains.set(card.evolveFrom, []);
        }
        evolutionChains.get(card.evolveFrom)!.push(card.id);
      }
    });

    evolutionChains.forEach((evolutions, baseName) => {
      const baseCards = cards.filter(
        (c) => c.card.name?.toLowerCase() === baseName.toLowerCase()
      );

      if (baseCards.length > 0) {
        synergies.push({
          type: 'evolution',
          description: `Chaîne d'évolution détectée: ${baseName}`,
          cardIds: [...baseCards.map((c) => c.card.id), ...evolutions]
        });
      }
    });

    // Synergie de support Trainer
    const trainerCards = cards.filter(
      (c) => c.card.category === PokemonCardsType.Trainer
    );
    if (trainerCards.length >= 5) {
      synergies.push({
        type: 'trainer-support',
        description: `${trainerCards.length} cartes Trainer pour le support`,
        cardIds: trainerCards.map((c) => c.card.id)
      });
    }

    return synergies;
  }
}
