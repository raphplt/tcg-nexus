import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import {User} from "../../user/entities/user.entity";
import {SupportTicket} from "../../support-ticket/entities/support-ticket.entity";

@Entity()
export class SupportMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SupportTicket, (supportTicket) => supportTicket.supportMessages, { onDelete: 'CASCADE' })
  supportTicket: SupportTicket;

  @ManyToOne(() => User, (user) => user.supportMessages, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  isStaff: boolean

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
