import { CollectionItem } from "src/collection-item/entities/collection-item.entity";
import { PokemonSet } from "src/pokemon-set/entities/pokemon-set.entity";
import { User } from "src/user/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("collection")
export class Collection {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string;

  @Column({ type: "boolean", default: false })
  isPublic: boolean;

  @ManyToOne(
    () => User,
    (user) => user.collections,
    { onDelete: "CASCADE" },
  )
  user: User;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;

  @ManyToOne(() => PokemonSet, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  masterSet?: PokemonSet;

  @OneToMany(
    () => CollectionItem,
    (item) => item.collection,
    { cascade: true },
  )
  items: CollectionItem[];
}
