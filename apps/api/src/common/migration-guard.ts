import { QueryRunner } from "typeorm";

/**
 * Reports whether a schema change is already present (FND-04).
 *
 * A database created from the initial baseline already holds the effects of
 * every migration the baseline squashed, and a legacy database may hold some of
 * them. Each historical migration probes for its own effect and returns early
 * when it finds it, so the chain runs on a fresh database, on a legacy one, and
 * twice in a row.
 *
 * @param queryRunner - Runner of the migration asking.
 * @param probe - Query returning at least one row when the change exists. It
 *   must be scoped to `current_schema()`: catalog views such as
 *   `information_schema.columns` span every visible schema, so an unscoped
 *   probe reports a change that a homonymous table in another schema carries
 *   and the migration skips the schema it was actually asked to alter.
 * @returns True when the change is already in place.
 */
export async function schemaAlreadyHas(
  queryRunner: QueryRunner,
  probe: string,
): Promise<boolean> {
  const rows = (await queryRunner.query(probe)) as unknown[];
  return rows.length > 0;
}

/**
 * Renames columns an earlier migration wrote under names the entities never read (FND-04).
 *
 * Each rename happens only where the written column exists and the expected one
 * does not, so a database already holding the expected schema is left alone
 * and the call can be repeated by several migrations.
 *
 * @param queryRunner - Runner of the migration asking.
 * @param table - Table holding the columns.
 * @param columns - Column pairs as [written, expected].
 */
export async function renameLegacyColumns(
  queryRunner: QueryRunner,
  table: string,
  columns: Array<[string, string]>,
): Promise<void> {
  for (const [written, expected] of columns) {
    await queryRunner.query(
      `DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = '${table}' AND column_name = '${written}'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = '${table}' AND column_name = '${expected}'
          ) THEN
            ALTER TABLE "${table}" RENAME COLUMN "${written}" TO "${expected}";
          END IF;
        END $$`,
    );
  }
}
