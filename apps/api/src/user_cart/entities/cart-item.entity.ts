import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index
} from 'typeorm';
import { UserCart } from './user_cart.entity';
import { Listing } from 'src/marketplace/entities/listing.entity';

@Entity()
@Index(['cart', 'listing'], { unique: true })
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserCart, (cart) => cart.cartItems, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'cart_id' })
  cart: UserCart;

  @ManyToOne(() => Listing, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
