import { Player } from "src/player/entities/player.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RegistrationPayment } from "./registration-payment.entity";
import { Tournament } from "./tournament.entity";

export enum RegistrationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  WAITLISTED = "waitlisted",
  ELIMINATED = "eliminated",
}

@Entity()
@Index(["tournament", "player"], { unique: true })
export class TournamentRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Tournament,
    (tournament) => tournament.registrations,
    {
      onDelete: "CASCADE",
    },
  )
  tournament: Tournament;

  @ManyToOne(() => Player, { onDelete: "CASCADE" })
  player: Player;

  @Column({
    type: "enum",
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: "timestamp", nullable: true })
  eliminatedAt: Date | null;

  @Column({ type: "int", nullable: true })
  eliminatedRound: number | null;

  /** Mid-tournament drop: the player is no longer paired. */
  @Column({ type: "timestamp", nullable: true })
  droppedAt: Date | null;

  @Column({ type: "int", nullable: true })
  droppedRound: number | null;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  paidAmount: number;

  @Column({ default: false })
  paymentCompleted: boolean;

  @Column({ type: "timestamp", nullable: true })
  paymentDueDate: Date;

  @Column({ nullable: true })
  confirmationCode: string;

  @Column({ default: false })
  checkedIn: boolean;

  @Column({ type: "timestamp", nullable: true })
  checkedInAt: Date | null;

  @CreateDateColumn()
  registeredAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => RegistrationPayment,
    (payment) => payment.registration,
    {
      cascade: true,
    },
  )
  payments: RegistrationPayment[];
}
