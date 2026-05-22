import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne, OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import {User} from "../../user/entities/user.entity";
import {SupportTicketStatusType} from "../../common/enums/supportTicketType";
import {SupportMessage} from "../../support-message/entities/support-message.entity";
@Entity()
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.supportTickets, { onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 100 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: SupportTicketStatusType,
    default: SupportTicketStatusType.opened
  })
  status: SupportTicketStatusType;

  @OneToMany(() => SupportMessage, (supportMessage) => supportMessage.supportTicket)
  supportMessages?: SupportMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
