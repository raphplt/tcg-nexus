import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm';
import { EnergyType } from 'src/common/enums/energyType';
import { PokemonCardsType } from 'src/common/enums/pokemonCardsType';
import { TrainerType } from 'src/common/enums/trainerType';
import { PokemonSet } from 'src/pokemon-set/entities/pokemon-set.entity';

@Entity()
export class PokemonCard {
  // Champs communs
  @PrimaryColumn()
  id: string; // L'ID unique de la carte. Exemple : swsh3-136

  @Column()
  localId: string; // L'ID local. Exemple : 136

  @Column()
  name: string; // Nom de la carte. Exemple : "Mew VMAX"

  @Column({ nullable: true })
  image?: string; // Image de la carte (asset)

  @Column()
  category: PokemonCardsType; // Catégorie : 'Pokemon', 'Energy', 'Trainer'

  @Column({ nullable: true })
  illustrator?: string; // Illustrateur de la carte. Exemple : "PLANETA"

  @Column({ nullable: true })
  rarity?: string; // Rareté de la carte

  // Variantes de la carte (normal, reverse, holo, firstEdition)
  @Column({ type: 'json' })
  variants: {
    normal: boolean;
    reverse: boolean;
    holo: boolean;
    firstEdition: boolean;
  };

  @ManyToOne(() => PokemonSet, (pokemonSet) => pokemonSet.cards)
  set: PokemonSet; // Référence vers le set de la carte

  // --------------------
  // Champs spécifiques aux cartes Pokémon
  // (optionnels si la carte n'est pas de type 'Pokemon')

  // Utilisation de "simple-json" pour stocker le tableau dans MySQL
  @Column({ type: 'simple-json', nullable: true })
  dexId?: number[]; // ID du Pokédex national

  @Column({ type: 'int', nullable: true })
  hp?: number; // Points de vie du Pokémon

  @Column({ type: 'simple-array', nullable: true })
  types?: string[]; // Types du Pokémon

  @Column({ nullable: true })
  evolveFrom?: string; // Nom du Pokémon dont il évolue

  @Column({ nullable: true })
  description?: string; // Description de la carte

  @Column({ nullable: true })
  level?: string; // Niveau du Pokémon (ex: 'lv.5')

  @Column({ nullable: true })
  stage?: string; // Stade d'évolution du Pokémon

  @Column({ nullable: true })
  suffix?: string; // Suffixe éventuel de la carte

  @Column({ type: 'json', nullable: true })
  item?: {
    name: string;
    effect: string;
  };

  @Column({ type: 'json', nullable: true })
  attacks?: {
    cost: string[];
    name: string;
    effect: string;
    damage?: number;
  }[];

  @Column({ type: 'json', nullable: true })
  weaknesses?: {
    type: string;
    value: string;
  }[];

  @Column({ type: 'int', nullable: true })
  retreat?: number;

  @Column({ nullable: true })
  regulationMark?: string;

  @Column({ type: 'json', nullable: true })
  legal?: {
    standard: boolean;
    expanded: boolean;
  };

  @Column({ nullable: true })
  updated?: string;

  // --------------------
  // Champs spécifiques aux cartes Trainer
  // (optionnels si la carte n'est pas de type 'Trainer')
  // 'effect' peut également être utilisé pour les cartes Energy
  @Column({ nullable: true })
  effect?: string; // Effet de la carte (Trainer ou Energy)

  @Column({ nullable: true })
  trainerType?: TrainerType; // Type de carte Trainer ('Supporter', 'Item', etc.)

  // --------------------
  // Champs spécifiques aux cartes Energy
  // (optionnels si la carte n'est pas de type 'Energy')
  @Column({ nullable: true })
  energyType?: EnergyType; // Type de carte Energy ('Basic', 'Special')
}
