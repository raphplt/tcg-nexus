import { MigrationInterface, QueryRunner } from "typeorm";
import { schemaAlreadyHas } from "../common/migration-guard";

export class PlatformShippingRates1785981600000 implements MigrationInterface {
  name = "PlatformShippingRates1785981600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The initial schema baseline already contains this change; the
    // probe also lets a legacy database re-run the chain safely.
    if (
      await schemaAlreadyHas(
        queryRunner,
        `SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'listing' AND column_name = 'handlingTimeDays'`,
      )
    ) {
      return;
    }

    await queryRunner.query(`
      UPDATE "listing"
      SET "shippingCost" = CASE
            WHEN "productKind" = 'sealed' THEN 6.90
            ELSE 3.50
          END,
          "handlingTimeDays" = 3
    `);
  }

  public async down(): Promise<void> {
    // Original seller-selected shipping rates cannot be restored.
  }
}
