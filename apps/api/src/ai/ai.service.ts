import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Card } from "../card/entities/card.entity";
import { PokemonCardsType } from "../common/enums/pokemonCardsType";
import { Deck } from "../deck/entities/deck.entity";
import { DeckAnalysisResponseDto } from "./dto/analyze-deck-response.dto";
import { AnalyzeDeckDto } from "./dto/analyze-deck.dto";

/**
 * Service evaluating deck balance, type curves, and tactical card synergies.
 */
@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Deck)
    private readonly deckRepo: Repository<Deck>,
    @InjectRepository(Card)
    private readonly pokemonCardRepo: Repository<Card>,
  ) {}

  /**
   * Analyzes deck composition (type breakdown, energy curve, duplicates, and synergies).
   *
   * @param dto Deck analysis payload containing either a persisted deckId or a list of cardIds.
   * @returns Comprehensive analysis response including warnings and deck-building recommendations.
   * @throws NotFoundException When the requested deckId cannot be found in the database.
   * @throws BadRequestException When neither deckId nor cardIds are provided, or when no matching cards are found.
   */
  async analyzeDeck(dto: AnalyzeDeckDto): Promise<DeckAnalysisResponseDto> {
    let cards: { card: Card; qty: number }[] = [];
    let deckId: number | undefined;

    if (dto.deckId) {
      const deck = await this.deckRepo.findOne({
        where: { id: dto.deckId },
        relations: ["cards", "cards.card", "cards.card.pokemonDetails"],
      });

      if (!deck) {
        throw new NotFoundException("Deck not found");
      }

      deckId = deck.id;
      cards =
        deck.cards
          ?.filter((dc) => Boolean(dc.card))
          .map((dc) => ({ card: dc.card, qty: dc.qty || 1 })) || [];
    } else if (dto.cardIds && dto.cardIds.length > 0) {
      const pokemonCards = await this.pokemonCardRepo.find({
        where: { id: In(dto.cardIds) },
        relations: ["pokemonDetails"],
      });

      if (pokemonCards.length === 0) {
        throw new BadRequestException("No cards found");
      }

      const cardCount = new Map<string, number>();
      dto.cardIds.forEach((id) => {
        cardCount.set(id, (cardCount.get(id) || 0) + 1);
      });

      cards = pokemonCards.map((card) => ({
        card,
        qty: cardCount.get(card.id) || 1,
      }));
    } else {
      throw new BadRequestException(
        "Either deckId or cardIds must be provided",
      );
    }

    return this.performAnalysis(cards, deckId);
  }

  /**
   * Computes distributions, detects duplicate copies, identifies archetype synergies,
   * and formulates deck-building recommendations based on standard competitive rules.
   *
   * @param cards Array of cards and their respective quantities.
   * @param deckId Optional identifier of the persisted deck being analyzed.
   * @returns Complete breakdown of deck statistics and actionable advice.
   */
  private performAnalysis(
    cards: { card: Card; qty: number }[],
    deckId?: number,
  ): DeckAnalysisResponseDto {
    const totalCards = cards.reduce((sum, c) => sum + c.qty, 0);

    const typeMap = new Map<string, number>();
    cards.forEach(({ card, qty }) => {
      const types = card.pokemonDetails?.types;
      if (types && types.length > 0) {
        types.forEach((type) => {
          typeMap.set(type, (typeMap.get(type) || 0) + qty);
        });
      }
    });

    const typeDistribution = Array.from(typeMap.entries()).map(
      ([type, count]) => ({
        type,
        count,
        percentage: totalCards > 0 ? Math.round((count / totalCards) * 100) : 0,
      }),
    );

    const categoryMap = new Map<string, number>();
    cards.forEach(({ card, qty }) => {
      const category = card.pokemonDetails?.category || "Unknown";
      categoryMap.set(category, (categoryMap.get(category) || 0) + qty);
    });

    const categoryDistribution = Array.from(categoryMap.entries()).map(
      ([category, count]) => ({
        category,
        count,
        percentage: totalCards > 0 ? Math.round((count / totalCards) * 100) : 0,
      }),
    );

    const costMap = new Map<number, number>();
    cards.forEach(({ card, qty }) => {
      const attacks = card.pokemonDetails?.attacks;
      if (attacks && attacks.length > 0) {
        attacks.forEach((attack) => {
          const cost = attack.cost?.length || 0;
          costMap.set(cost, (costMap.get(cost) || 0) + qty);
        });
      }
    });

    const energyCostDistribution = Array.from(costMap.entries())
      .map(([cost, count]) => ({
        cost,
        count,
        percentage: totalCards > 0 ? Math.round((count / totalCards) * 100) : 0,
      }))
      .sort((a, b) => a.cost - b.cost);

    const duplicates = cards
      .filter((c) => c.qty > 1)
      .map((c) => ({
        cardId: c.card.id,
        cardName: c.card.name || "Unknown",
        count: c.qty,
      }));

    const synergies = this.detectSynergies(cards);

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Canonical Pokémon TCG deck construction requires exactly 60 cards
    if (totalCards < 60) {
      warnings.push(`Deck incomplet: ${totalCards}/60 cartes`);
    } else if (totalCards > 60) {
      warnings.push(`Deck trop grand: ${totalCards}/60 cartes`);
    }

    // Competitive guideline: balanced decks typically feature 30-40% energy cards
    const energyCount = categoryMap.get(PokemonCardsType.Energy) || 0;
    const energyPercentage =
      totalCards > 0 ? (energyCount / totalCards) * 100 : 0;

    if (energyPercentage < 30) {
      recommendations.push(
        "Considérez ajouter plus de cartes énergie (recommandé: 30-40%)",
      );
    } else if (energyPercentage > 50) {
      recommendations.push(
        "Trop de cartes énergie, considérez en retirer quelques-unes",
      );
    }

    // A minimal core of 10 trainer cards is recommended to maintain hand flow and consistency
    const trainerCount = categoryMap.get(PokemonCardsType.Trainer) || 0;
    if (trainerCount < 10) {
      recommendations.push(
        "Ajoutez plus de cartes Trainer pour améliorer la consistance du deck",
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
      recommendations,
    };
  }

  /**
   * Identifies tactical synergies including shared energy types, evolution lines, and trainer cores.
   *
   * @param cards Evaluated card pool with quantities.
   * @returns Detected synergy groupings.
   */
  private detectSynergies(
    cards: { card: Card; qty: number }[],
  ): DeckAnalysisResponseDto["synergies"] {
    const synergies: DeckAnalysisResponseDto["synergies"] = [];

    const typeGroups = new Map<string, string[]>();
    cards.forEach(({ card }) => {
      const types = card.pokemonDetails?.types;
      if (types && types.length > 0) {
        types.forEach((type) => {
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
          type: "energy-type",
          description: `${cardIds.length} cartes de type ${type} détectées`,
          cardIds,
        });
      }
    });

    const evolutionChains = new Map<string, string[]>();
    cards.forEach(({ card }) => {
      const evolveFrom = card.pokemonDetails?.evolveFrom;
      if (evolveFrom) {
        if (!evolutionChains.has(evolveFrom)) {
          evolutionChains.set(evolveFrom, []);
        }
        evolutionChains.get(evolveFrom)!.push(card.id);
      }
    });

    evolutionChains.forEach((evolutions, baseName) => {
      const baseCards = cards.filter(
        (c) => c.card.name?.toLowerCase() === baseName.toLowerCase(),
      );

      if (baseCards.length > 0) {
        synergies.push({
          type: "evolution",
          description: `Chaîne d'évolution détectée: ${baseName}`,
          cardIds: [...baseCards.map((c) => c.card.id), ...evolutions],
        });
      }
    });

    const trainerCards = cards.filter(
      (c) => c.card.pokemonDetails?.category === PokemonCardsType.Trainer,
    );
    if (trainerCards.length >= 5) {
      synergies.push({
        type: "trainer-support",
        description: `${trainerCards.length} cartes Trainer pour le support`,
        cardIds: trainerCards.map((c) => c.card.id),
      });
    }

    return synergies;
  }
}
