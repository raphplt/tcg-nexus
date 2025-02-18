import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import TCGdex from '@tcgdex/sdk';

@Injectable()
export class TcgDexService {
  private readonly tcgdex: TCGdex;

  constructor() {
    this.tcgdex = new TCGdex('fr');
  }

  async getCardById(cardId: string): Promise<any> {
    try {
      const card = await this.tcgdex.fetch('cards', cardId);
      return card;
    } catch (error) {
      throw new HttpException(
        'Carte non trouvée ou erreur avec l’API de TCGdex',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getSeriesById(seriesId: string): Promise<any> {
    try {
      const series = await this.tcgdex.fetch('series', seriesId);
      return series;
    } catch (error) {
      throw new HttpException(
        'Série non trouvée ou erreur avec l’API de TCGdex',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getSetById(setid: string): Promise<any> {
    try {
      const sets = await this.tcgdex.fetch('sets', setid);
      return sets;
    } catch (error) {
      throw new HttpException(
        'Set non trouvée ou erreur avec l’API de TCGdex',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async getSetWithCards(setId: string): Promise<any> {
    try {
      // 1. Récupération des informations du set
      const setData = await this.tcgdex.fetch('sets', setId);
      if (!setData || !setData.cards) {
        throw new HttpException('Set non trouvé', HttpStatus.NOT_FOUND);
      }

      // 2. Récupération des cartes du set
      const cardsPromises = setData.cards.map(async (card: any) => {
        return await this.tcgdex.fetch('cards', card.id);
      });

      const cards = await Promise.all(cardsPromises);

      // 3. Retourner les données formatées
      return {
        ...setData,
        cards: cards.filter((card) => card !== null),
      };
    } catch (error) {
      throw new HttpException(
        'Erreur lors de la récupération des données du set',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getBloc(seriesId: string): Promise<any> {
    try {
      const series = await this.tcgdex.fetch('series', seriesId);
      if (!series || !series.sets) {
        throw new HttpException('Série non trouvée', HttpStatus.NOT_FOUND);
      }

      const setsPromises = series.sets.map(async (set: any) => {
        const setData = await this.tcgdex.fetch('sets', set.id);

        if (!setData || !setData.cards) return null;

        const cardsPromises = setData.cards.map(async (card: any) => {
          return await this.tcgdex.fetch('cards', card.id);
        });

        const cards = await Promise.all(cardsPromises);

        return {
          ...setData,
          cards: cards.filter((card) => card !== null),
        };
      });

      const setsWithCards = await Promise.all(setsPromises);

      // 4. Retourner les données formatées
      return {
        ...series,
        sets: setsWithCards.filter((set) => set !== null),
      };
    } catch (error) {
      throw new HttpException(
        'Erreur lors de la récupération des données de la série',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
