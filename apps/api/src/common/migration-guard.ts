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
 * @param probe - Query returning at least one row when the change exists.
 * @returns True when the change is already in place.
 */
export async function schemaAlreadyHas(
  queryRunner: QueryRunner,
  probe: string,
): Promise<boolean> {
  const rows = (await queryRunner.query(probe)) as unknown[];
  return rows.length > 0;
}
