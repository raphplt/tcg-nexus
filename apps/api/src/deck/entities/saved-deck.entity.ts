import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Deck } from "./deck.entity";

@Entity()
@Unique(["user", "deck"])
export class SavedDeck {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user!: User;

  @ManyToOne(() => Deck, { onDelete: "CASCADE" })
  deck!: Deck;

  @CreateDateColumn()
  createdAt!: Date;
}
