import { MigrationInterface, QueryRunner } from "typeorm";

export class PlatformShippingRates1785981600000 implements MigrationInterface {
  name = "PlatformShippingRates1785981600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
    // Les tarifs choisis par les vendeurs ne sont pas récupérables.
  }
}
