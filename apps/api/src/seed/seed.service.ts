/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { PokemonSerie } from 'src/pokemon-series/entities/pokemon-serie.entity';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';
import * as pokemonSeriesData from 'src/common/data/pokemon_series.json';
import * as pokemonSetsData from 'src/common/data/pokemon_sets.json';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import { PokemonCard } from 'src/pokemon-card/entities/pokemon-card.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(PokemonSerie)
    private readonly pokemonSerieRepository: Repository<PokemonSerie>,
    @InjectRepository(PokemonSet)
    private readonly pokemonSetRepository: Repository<PokemonSet>,
    @InjectRepository(PokemonCard)
    private readonly pokemonCardRepository: Repository<PokemonCard>
  ) {}

  /**
   * Clean special characters from a string
   * @param {string} str - The string to clean
   * @returns {string} - The cleaned string
   */
  cleanString(str: string): string {
    // Convert special characters to their ASCII equivalents or remove them
    // eslint-disable-next-line no-control-regex
    return str.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  }
  /**
   * Seed the database with the Pokemon Series data
   * @returns {Promise<PokemonSerie[]>} The Pokemon Series created
   * @throws {Error} If a Serie is not found
   */
  async importPokemonSeries() {
    const series: PokemonSerie[] = [];

    for (const serieData of pokemonSeriesData as DeepPartial<PokemonSerie>[]) {
      const existingSerie = await this.pokemonSerieRepository.findOne({
        where: { name: serieData.name }
      });

      if (!existingSerie) {
        const newSerie = this.pokemonSerieRepository.create(serieData);
        series.push(newSerie);
      }
    }

    if (series.length > 0) {
      await this.pokemonSerieRepository.save(series);
    }

    return series;
  }

  /**
   * Seed the database with the Pokemon Sets data
   * @returns {Promise<PokemonSet[]>} The Pokemon Sets created
   * @throws {Error} If a Serie is not found
   */
  async importPokemonSets() {
    const sets: PokemonSet[] = [];

    for (const setData of pokemonSetsData as DeepPartial<PokemonSet>[]) {
      const existingSet = await this.pokemonSetRepository.findOne({
        where: { name: setData.name }
      });

      if (!existingSet) {
        const serie = await this.pokemonSerieRepository.findOne({
          where: { id: setData.serie?.id }
        });

        if (serie) {
          const newSet = this.pokemonSetRepository.create({
            ...setData,
            serie
          });
          sets.push(newSet);
        }
      }
    }

    if (sets.length > 0) {
      await this.pokemonSetRepository.save(sets);
    }

    return sets;
  }

  /**
   * Seed the database with the Pokemon Series and Sets data
   *
   * @returns {Promise<{ series: PokemonSerie[], sets: PokemonSet[], cards: PokemonCard[] }>} The Pokemon Series and Sets created
   * @throws {Error} If a Serie is not found
   */
  async importPokemon(): Promise<{
    series: PokemonSerie[];
    sets: PokemonSet[];
    cards: PokemonCard[];
  }> {
    const series = await this.importPokemonSeries();
    const sets = await this.importPokemonSets();

    // Récupère le chemin du fichier zip
    const zipPath = path.resolve(__dirname, '../common/data/pokemons.zip');
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipPath);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to read zip file at ${zipPath}: ${error.message}`
        );
      } else {
        throw new Error(`Failed to read zip file at ${zipPath}`);
      }
    }

    const zipEntries = zip.getEntries();
    const cards: PokemonCard[] = [];

    if (zipEntries && zipEntries.length > 0) {
      const content = zipEntries[0];
      const firstEntryContent = content.getData().toString('utf8');

      try {
        // Parse le contenu JSON
        if (typeof firstEntryContent !== 'string') {
          throw new Error('Invalid content type, expected a string');
        }
        const pokemons: any[] = JSON.parse(firstEntryContent);

        // Parcours de chaque carte du JSON
        for (const cardData of pokemons) {
          // Récupération de l'ID du set dans le JSON
          const setId = cardData.set?.id;
          if (!setId) {
            // console.warn(`Carte ${cardData.id} sans set défini.`);
            continue;
          }
          // Recherche du set correspondant en BDD
          const set = await this.pokemonSetRepository.findOne({
            where: { id: setId }
          });
          if (!set) {
            console.warn(
              `Set avec id ${setId} non trouvé pour la carte ${cardData.id}.`
            );
            continue;
          }
          // Supprime la propriété "set" du JSON et lui réassigne le set trouvé
          delete cardData.set;
          cardData.set = set;

          // Assigner l'id à tcgDexId et supprimer l'id de cardData
          cardData.tcgDexId = cardData.id;
          delete cardData.id;

          // Nettoyer le nom de la carte pour retirer les caractères spéciaux
          cardData.name = cardData.name ? this.cleanString(cardData.name) : '';
          cardData.illustrator = cardData.illustrator
            ? this.cleanString(cardData.illustrator)
            : null;
          cardData.description = cardData.description
            ? this.cleanString(cardData.description)
            : null;
          cardData.evolveFrom = cardData.evolveFrom
            ? this.cleanString(cardData.evolveFrom)
            : null;
          cardData.effect = cardData.effect
            ? this.cleanString(cardData.effect)
            : null;

          // Optionnel : Nettoyage de l'objet variants pour retirer d'éventuels attributs non désirés
          if (cardData.variants && cardData.variants.wPromo !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { wPromo, ...validVariants } = cardData.variants;
            cardData.variants = validVariants;
          }

          // Création de l'entité PokemonCard à partir des données
          const card = this.pokemonCardRepository.create(
            cardData as DeepPartial<PokemonCard>
          );
          cards.push(card);
        }

        // Sauvegarde des cartes en base
        if (cards.length > 0) {
          await this.pokemonCardRepository.save(cards);
        }
      } catch (jsonError) {
        console.error('Failed to parse JSON content:', jsonError);
      }
    } else {
      console.log('No entries found in the zip file.');
    }

    return { series, sets, cards };
  }

  /**
   * Truncate all tables before seeding
   */
  async truncateTables() {
    await this.pokemonCardRepository.query('DELETE FROM pokemon_card');
    await this.pokemonSetRepository.query('DELETE FROM pokemon_set');
    await this.pokemonSerieRepository.query('DELETE FROM pokemon_serie');
  }
}
