import { SelectQueryBuilder } from "typeorm";

/**
 * SQL conditions targeting catalog labels.
 *
 * Since the multilingual switch, `card`, `pokemon_set` and `pokemon_serie`
 * carry no localized field: name, rarity, description and image live in the
 * translation tables, one row per locale.
 *
 * These conditions use `EXISTS` rather than joins: joining a one-to-many
 * relation would multiply rows and break the callers' `limit`.
 *
 * `immutable_unaccent` makes comparisons diacritic-insensitive — "pokemon"
 * finds "Pokémon". It is an IMMUTABLE wrapper around `unaccent`, the only
 * indexable form: the expression must be written exactly as in the
 * `card_translation` trigram index, otherwise Postgres ignores it.
 * The function and extensions are created by the `CatalogTranslations`
 * migration and by `SeedService.enableExtensions()`.
 */

/**
 * Full-text card search across every locale: a French speaker typing
 * "Charizard" must find Dracaufeu, and the other way around.
 *
 * @param qb Query builder to extend.
 * @param search Raw user input.
 * @param options Alias of the card table, when it is not `card`.
 * @returns The same query builder, with the search condition applied.
 */
export function applyCardSearch<T extends object>(
  qb: SelectQueryBuilder<T>,
  search: string,
  options: { alias?: string } = {},
): SelectQueryBuilder<T> {
  const alias = options.alias ?? "card";

  const conditions = [
    `${alias}.localId ILIKE :cardSearch`,
    // Illustrator is a proper noun: untranslated on the card entity
    `immutable_unaccent(${alias}.illustrator) ILIKE immutable_unaccent(:cardSearch)`,
    `EXISTS (
      SELECT 1 FROM card_translation ct
      WHERE ct.card_id = ${alias}.id
        AND (
          immutable_unaccent(ct.name) ILIKE immutable_unaccent(:cardSearch)
          OR immutable_unaccent(ct.description) ILIKE immutable_unaccent(:cardSearch)
          OR ct.rarity ILIKE :cardSearch
        )
    )`,
    `EXISTS (
      SELECT 1 FROM pokemon_set_translation st
      WHERE st.set_id = ${alias}."setId"
        AND immutable_unaccent(st.name) ILIKE immutable_unaccent(:cardSearch)
    )`,
  ];

  return qb.andWhere(`(${conditions.join(" OR ")})`, {
    cardSearch: `%${search}%`,
  });
}

/**
 * SQL fragment testing a card name across every locale, meant to be composed
 * in an `OR` with other criteria (seller, listing description…).
 * The bound parameter is expected to be a lowercase `%…%` pattern.
 *
 * @param alias Alias of the card table.
 * @param param Name of the bound search parameter.
 * @returns SQL fragment.
 */
export function cardNameMatchesSql(alias: string, param = "search"): string {
  return `EXISTS (
    SELECT 1 FROM card_translation ct
    WHERE ct.card_id = ${alias}.id
      AND LOWER(immutable_unaccent(ct.name)) LIKE immutable_unaccent(:${param})
  )`;
}

/**
 * Scalar subquery returning a card name in one locale, for a `SELECT` needing
 * a single value per card. Not usable directly in `ORDER BY`: TypeORM would
 * parse the subquery as an alias — join the translations instead.
 *
 * @param alias Alias of the card table.
 * @param localeParam Name of the bound locale parameter.
 * @returns SQL fragment.
 */
export function localizedNameSql(alias: string, localeParam = "sortLocale") {
  return `(
    SELECT ct.name FROM card_translation ct
    WHERE ct.card_id = ${alias}.id AND ct.locale = :${localeParam}
    LIMIT 1
  )`;
}

/**
 * Scalar subquery returning a card rarity in one locale.
 *
 * @param alias Alias of the card table.
 * @param localeParam Name of the bound locale parameter.
 * @returns SQL fragment.
 */
export function localizedRaritySql(alias: string, localeParam = "sortLocale") {
  return `(
    SELECT ct.rarity FROM card_translation ct
    WHERE ct.card_id = ${alias}.id AND ct.locale = :${localeParam}
    LIMIT 1
  )`;
}

/**
 * Rarity filter. The incoming value is a displayed label, hence tied to one
 * locale: it is matched across every locale so a filter picked in English also
 * works during a French session.
 *
 * @param qb Query builder to extend.
 * @param rarity Rarity label to match.
 * @param options Alias of the card table, when it is not `card`.
 * @returns The same query builder, with the filter applied.
 */
export function applyRarityFilter<T extends object>(
  qb: SelectQueryBuilder<T>,
  rarity: string,
  options: { alias?: string } = {},
): SelectQueryBuilder<T> {
  const alias = options.alias ?? "card";

  return qb.andWhere(
    `EXISTS (
      SELECT 1 FROM card_translation ct
      WHERE ct.card_id = ${alias}.id AND ct.rarity = :cardRarity
    )`,
    { cardRarity: rarity },
  );
}
