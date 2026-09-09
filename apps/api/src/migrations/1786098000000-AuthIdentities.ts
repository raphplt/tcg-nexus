import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

/** Adds auth_identity table for OAuth providers and makes user password nullable. */
export class AuthIdentities1786098000000 implements MigrationInterface {
  name = "AuthIdentities1786098000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_identity'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      CREATE TYPE "auth_identity_provider_enum" AS ENUM ('google', 'apple', 'discord')
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_identity" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "provider" "auth_identity_provider_enum" NOT NULL,
        "providerSubject" character varying(255) NOT NULL,
        "providerEmail" character varying(255),
        "providerEmailVerified" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_identity_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_auth_identity_provider_subject" UNIQUE ("provider", "providerSubject"),
        CONSTRAINT "FK_auth_identity_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_auth_identity_userId" ON "auth_identity" ("userId")
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ALTER COLUMN "password" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" ALTER COLUMN "password" SET NOT NULL
    `);
    await queryRunner.query(`DROP INDEX "IDX_auth_identity_userId"`);
    await queryRunner.query(`DROP TABLE "auth_identity"`);
    await queryRunner.query(`DROP TYPE "auth_identity_provider_enum"`);
  }
}
