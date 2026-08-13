import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Surcouche éditable des dictionnaires du dépôt : seules les clés modifiées
 * depuis l'administration sont stockées ici.
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
