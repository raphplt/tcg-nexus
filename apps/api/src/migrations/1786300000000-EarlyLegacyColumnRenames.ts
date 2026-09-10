import { MigrationInterface, QueryRunner } from "typeorm";
import { renameLegacyColumns } from "../common/migration-guard";
import { RepairLegacyColumnNames1789500000000 } from "./1789500000000-RepairLegacyColumnNames";

/**
 * Renames the snake_case columns written by the inventory, tournament and
 * settlement migrations as soon as they exist (FND-04).
 *
 * On a database adopted from `synchronize`, those three migrations really run
 * and write snake_case columns, while every later migration reads the camelCase
 * names the entities use. RepairLegacyColumnNames performs the same renames but
 * only after those readers, so the chain failed on the first of them. Running
 * the renames here, between the writers and the readers, lets the chain pass;
 * RepairLegacyColumnNames then finds nothing left to rename.
 *
 * Each rename is guarded, so a fresh or already repaired database is untouched.
 */
export class EarlyLegacyColumnRenames1786300000000
  implements MigrationInterface
{
  name = "EarlyLegacyColumnRenames1786300000000";

  /** Applies every legacy rename whose snake_case column is present. */
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [
      table,
      columns,
    ] of RepairLegacyColumnNames1789500000000.RENAMES) {
      await renameLegacyColumns(queryRunner, table, columns);
    }
  }

  /** Reverses nothing: the renamed columns are the ones the application reads. */
  async down(): Promise<void> {
    return;
  }
}
