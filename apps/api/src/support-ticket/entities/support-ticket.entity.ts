import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { SupportTicketStatusType } from "../../common/enums/supportTicketType";
import { SupportMessage } from "../../support-message/entities/support-message.entity";
import { Order } from "../../marketplace/entities/order.entity";
import { OrderItem } from "../../marketplace/entities/order-item.entity";
import { ClaimCategory } from "../../common/enums/claim-category";
@Entity()
export class SupportTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => User,
    (user) => user.supportTickets,
    { onDelete: "CASCADE" },
  )
  user: User;

  @Column({ length: 100 })
  subject: string;

  @Column({ type: "text" })
  message: string;

  @Column({
    type: "enum",
    enum: SupportTicketStatusType,
    default: SupportTicketStatusType.opened,
  })
  status: SupportTicketStatusType;

  @OneToMany(
    () => SupportMessage,
    (supportMessage) => supportMessage.supportTicket,
  )
  supportMessages?: SupportMessage[];

  @Index()
  @ManyToOne(() => Order, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "order_id" })
  order?: Order | null;

  @Index()
  @ManyToOne(() => OrderItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "order_item_id" })
  orderItem?: OrderItem | null;

  @Column({
    type: "enum",
    enum: ClaimCategory,
    nullable: true,
  })
  claimCategory?: ClaimCategory | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
