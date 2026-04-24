import { SealedProduct } from "src/sealed-product/entities/sealed-product.entity";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum SealedEventType {
  VIEW = "view",
  SEARCH = "search",
  FAVORITE = "favorite",
  ADD_TO_CART = "add_to_cart",
  SALE = "sale",
}

@Entity("sealed_events")
@Index(["sealedProduct", "createdAt"])
@Index(["sealedProduct", "eventType", "createdAt"])
@Index(["createdAt"])
export class SealedEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SealedProduct, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "sealed_product_id" })
  sealedProduct: SealedProduct;

  @Column({ type: "enum", enum: SealedEventType })
  eventType: SealedEventType;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ type: "varchar", length: 255, nullable: true })
  sessionId?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: "jsonb", nullable: true })
  context?: {
    searchQuery?: string;
    referrer?: string;
    listingId?: number;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;
}
