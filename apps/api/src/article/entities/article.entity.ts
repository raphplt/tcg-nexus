import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

/** Publication state of an article. */
export enum ArticleStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

/** Persistent editorial article and its publication metadata. */
@Entity()
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ unique: true, length: 180 })
  slug: string;

  @Column({ type: "text", nullable: true })
  excerpt?: string | null;

  @Column({ type: "varchar", nullable: true })
  image?: string | null;

  @Column({ type: "varchar", nullable: true })
  link?: string | null;

  @Column({ type: "text", nullable: true })
  content?: string | null;

  @Column({
    type: "enum",
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  @Column({ type: "varchar", length: 10, default: "fr" })
  locale: string;

  @Column({ type: "varchar", nullable: true })
  metaTitle?: string | null;

  @Column({ type: "text", nullable: true })
  metaDescription?: string | null;

  @Column({ type: "integer", nullable: true })
  authorId?: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "authorId" })
  author?: Pick<User, "id" | "firstName" | "lastName">;

  @Column({ type: "timestamp", nullable: true })
  publishedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
