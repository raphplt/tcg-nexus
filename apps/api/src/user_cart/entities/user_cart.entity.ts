import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { CartItem } from './cart-item.entity';

@Entity()
export class UserCart {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.userCart, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, {
    cascade: true
  })
  cartItems: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
