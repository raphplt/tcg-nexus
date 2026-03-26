import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  PrimaryColumn
} from 'typeorm';
import { Card } from './card.entity';
import { PokemonCardsType } from 'src/common/enums/pokemonCardsType';
import { TrainerType } from 'src/common/enums/trainerType';
import { EnergyType } from 'src/common/enums/energyType';

export type PokemonAbility = {
  type?: string;
  name?: string;
  effect?: string;
};

export type PokemonAttack = {
  cost: string[];
  name: string;
  effect?: string;
  damage?: string | number;
};

export type PokemonWeaknessResistance = {
  type: string;
  value: string;
};

@Entity()
export class PokemonCardDetails {
  @PrimaryColumn('uuid', { name: 'card_id' })
  cardId: string;

  @OneToOne(() => Card, (card) => card.pokemonDetails, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'card_id', referencedColumnName: 'id' })
  card: Card;

  @Column({ type: 'enum', enum: PokemonCardsType, nullable: true })
  category?: PokemonCardsType;

  @Column({ type: 'int', array: true, nullable: true })
  dexId?: number[];

  @Column({ type: 'int', nullable: true })
  hp?: number;

  @Column('text', { array: true, nullable: true })
  types?: string[];

  @Column({ nullable: true })
  evolveFrom?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  effect?: string;

  @Column({ nullable: true })
  level?: string;

  @Column({ nullable: true })
  stage?: string;

  @Column({ nullable: true })
  suffix?: string;

  @Column({ type: 'jsonb', nullable: true })
  item?: {
    name: string;
    effect: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  abilities?: PokemonAbility[];

  @Column({ type: 'jsonb', nullable: true })
  attacks?: PokemonAttack[];

  @Column({ type: 'jsonb', nullable: true })
  weaknesses?: PokemonWeaknessResistance[];

  @Column({ type: 'jsonb', nullable: true })
  resistances?: PokemonWeaknessResistance[];

  @Column({ type: 'int', nullable: true })
  retreat?: number;

  @Column({ nullable: true })
  regulationMark?: string;

  @Column({ nullable: true })
  trainerType?: TrainerType;

  @Column({ nullable: true })
  energyType?: EnergyType;

  @Column({ type: 'jsonb', nullable: true })
  boosters?: {
    id?: string;
    name?: string;
  }[];
}
