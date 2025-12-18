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
import { Currency } from 'src/common/enums/currency';
import { UserCart } from 'src/user_cart/entities/user_cart.entity';
import { TournamentOrganizer } from 'src/tournament/entities';
import {SupportTicket} from "../../support-ticket/entities/support-ticket.entity";
import {SupportMessage} from "../../support-message/entities/support-message.entity";

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

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.EUR
  })
  preferredCurrency: Currency;

  @Column({ default: false })
  isPro: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  refreshToken: string | null;

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

  @OneToMany(() => SupportTicket, (supportTicket) => supportTicket.user)
  supportTickets?: SupportTicket[];

  @OneToMany(() => SupportMessage, (supportMessage) => supportMessage.user)
  supportMessages?: SupportMessage[];

  // Dates
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
