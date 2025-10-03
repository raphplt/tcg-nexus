import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { CollectionItem } from 'src/collection-item/entities/collection-item.entity';

@Entity('collection')
export class Collection {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @ManyToOne(() => User, (user) => user.collections, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => CollectionItem, (item) => item.collection, { cascade: true })
  items: CollectionItem[];
}
