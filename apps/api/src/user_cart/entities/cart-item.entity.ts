import { Listing } from "src/marketplace/entities/listing.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserCart } from "./user_cart.entity";

@Entity()
@Index(["cart", "listing"], { unique: true })
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => UserCart,
    (cart) => cart.cartItems,
    {
      nullable: false,
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "cart_id" })
  cart: UserCart;

  @ManyToOne(() => Listing, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "listing_id" })
  listing: Listing;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
