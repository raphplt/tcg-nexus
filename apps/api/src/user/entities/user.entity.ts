import { Exclude } from "class-transformer";
import { UserBadge } from "src/badge/entities/user-badge.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { Currency } from "src/common/enums/currency";
import { UserRole } from "src/common/enums/user";
import { Deck } from "src/deck/entities/deck.entity";
import { Player } from "src/player/entities/player.entity";
import { TournamentOrganizer } from "src/tournament/entities";
import { UserCart } from "src/user_cart/entities/user_cart.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

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
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: "enum",
    enum: Currency,
    default: Currency.EUR,
  })
  preferredCurrency: Currency;

  @Column({ default: false })
  isPro: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: "varchar", nullable: true })
  @Exclude()
  refreshToken: string | null;

  @Column({ type: "varchar", nullable: true })
  @Exclude()
  previousRefreshToken: string | null;

  @Column({ type: "timestamp", nullable: true })
  @Exclude()
  previousRefreshTokenExpiresAt: Date | null;

  // Relations
  @OneToOne(
    () => Player,
    (player) => player.user,
    { nullable: true },
  )
  player?: Player;

  @OneToMany(
    () => Deck,
    (deck) => deck.user,
  )
  decks?: Deck[];

  @OneToMany(
    () => Collection,
    (collection) => collection.user,
  )
  collections?: Collection[];

  @OneToOne(
    () => UserCart,
    (userCart) => userCart.user,
  )
  userCart?: UserCart;

  @OneToMany(
    () => TournamentOrganizer,
    (organizer) => organizer.user,
  )
  tournamentOrganizers: TournamentOrganizer[];

  @OneToMany(
    () => UserBadge,
    (userBadge) => userBadge.user,
  )
  userBadges?: UserBadge[];

  // Dates
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
