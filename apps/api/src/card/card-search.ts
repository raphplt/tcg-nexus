import { SelectQueryBuilder } from "typeorm";

/**
 * Conditions SQL portant sur les libellés du catalogue.
 *
 * Depuis la bascule multilingue, `card`, `pokemon_set` et `pokemon_serie` ne
 * portent plus aucun champ linguistique : nom, rareté, description et image
 * vivent dans les tables de traduction, une ligne par langue.
 *
 * Ces conditions passent par des `EXISTS` plutôt que par des jointures : une
 * jointure sur une relation « un-à-plusieurs » multiplierait les lignes et
 * fausserait les `limit` des appelants.
 *
 * `immutable_unaccent` rend les comparaisons insensibles aux diacritiques —
 * « pokemon » trouve « Pokémon ». C'est un wrapper IMMUTABLE autour de
 * `unaccent`, seul indexable : l'expression doit être écrite exactement comme
 * dans l'index trigram de `card_translation`, sinon Postgres l'ignore.
 * Fonction et extensions sont créées par la migration `CatalogTranslations`
 * et par `SeedService.enableExtensions()`.
 */

/**
 * Recherche plein texte sur une carte, toutes langues confondues : un
 * francophone qui tape « Charizard » doit trouver Dracaufeu, et l'inverse.
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
 * Fragment SQL testant le nom d'une carte dans toutes les langues, à composer
 * dans un `OR` avec d'autres critères (vendeur, description d'annonce…).
 * Le paramètre attendu est un motif `%…%` déjà en minuscules.
 */
export function cardNameMatchesSql(alias: string, param = "search"): string {
  return `EXISTS (
    SELECT 1 FROM card_translation ct
    WHERE ct.card_id = ${alias}.id
      AND LOWER(immutable_unaccent(ct.name)) LIKE immutable_unaccent(:${param})
  )`;
}

/**
 * Sous-requête scalaire renvoyant le nom d'une carte dans une langue, pour un
 * `ORDER BY` ou un `SELECT` qui a besoin d'une valeur unique par carte.
 */
export function localizedNameSql(alias: string, localeParam = "sortLocale") {
  return `(
    SELECT ct.name FROM card_translation ct
    WHERE ct.card_id = ${alias}.id AND ct.locale = :${localeParam}
    LIMIT 1
  )`;
}

/** Sous-requête scalaire renvoyant la rareté d'une carte dans une langue. */
export function localizedRaritySql(alias: string, localeParam = "sortLocale") {
  return `(
    SELECT ct.rarity FROM card_translation ct
    WHERE ct.card_id = ${alias}.id AND ct.locale = :${localeParam}
    LIMIT 1
  )`;
}

/**
 * Filtre sur la rareté. La valeur reçue est un libellé affiché, donc dans une
 * langue donnée : on la cherche dans toutes les langues pour qu'un filtre posé
 * en anglais fonctionne aussi sur une session française.
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
