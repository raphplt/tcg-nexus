import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Player } from 'src/player/entities/player.entity';
import { Deck } from 'src/deck/entities/deck.entity';
import { Collection } from 'src/collection/entities/collection.entity';
import { UserRole } from 'src/common/enums/user';
import { UserCart } from 'src/user_cart/entities/user_cart.entity';
import { TournamentOrganizer } from 'src/tournament/entities';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({ default: false })
  isPro: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  @Exclude()
  refreshToken: string;

  // Relations
  @OneToOne(() => Player, (player) => player.user, { nullable: true })
  player?: Player;

  @OneToMany(() => Deck, (deck) => deck.user)
  decks?: Deck[];

  @OneToMany(() => Collection, (collection) => collection.user)
  collections?: Collection[];

  @OneToOne(() => UserCart, (userCart) => userCart.user)
  userCart?: UserCart;

  @OneToMany(() => TournamentOrganizer, (organizer) => organizer.user)
  tournamentOrganizers: TournamentOrganizer[];

  // Dates
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
