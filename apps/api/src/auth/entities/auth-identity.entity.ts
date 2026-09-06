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
import { User } from "../../user/entities/user.entity";

/**
 * Supported external identity providers.
 */
export enum OAuthProvider {
  GOOGLE = "google",
  APPLE = "apple",
  DISCORD = "discord",
}

/**
 * Entity linking a local User account to a third-party OAuth identity provider.
 */
@Entity("auth_identity")
@Index(["provider", "providerSubject"], { unique: true })
export class AuthIdentity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "userId" })
  userId: number;

  @ManyToOne(
    () => User,
    (user) => user.identities,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({
    type: "enum",
    enum: OAuthProvider,
  })
  provider: OAuthProvider;

  @Column({ type: "varchar", length: 255 })
  providerSubject: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerEmail: string | null;

  @Column({ type: "boolean", default: false })
  providerEmailVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
