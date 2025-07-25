import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { Currency } from './currency.enum';

export enum OrderStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  SHIPPED = 'Shipped',
  CANCELLED = 'Cancelled',
  REFUNDED = 'Refunded'
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;

  @Column('decimal', { precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrderItem, (orderItem: any) => orderItem.order, {
    cascade: true
  })
  orderItems: any[];

  @OneToMany(() => PaymentTransaction, (payment: any) => payment.order)
  payments: any[];
}
