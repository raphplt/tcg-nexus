import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Editable overlay on the repository's dictionaries: only keys modified
 * from the admin panel are stored here.
 */
@Entity({ name: "translation" })
@Index(["locale", "key"], { unique: true })
export class Translation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 10 })
  locale: string;

  @Column({ type: "varchar", length: 255 })
  key: string;

  @Column({ type: "text" })
  value: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
