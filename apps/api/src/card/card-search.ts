import { SelectQueryBuilder } from "typeorm";

/**
 * Recherche de cartes, toutes langues confondues.
 *
 * Le nom d'une carte vit désormais dans `card_translation`, une ligne par
 * langue. On cherche dans toutes les langues activées plutôt que dans la seule
 * langue de la requête : un francophone qui tape « Charizard » doit trouver
 * Dracaufeu, et l'inverse.
 *
 * La condition passe par un `EXISTS` et non par une jointure : une jointure sur
 * une relation « un-à-plusieurs » multiplierait les lignes et fausserait les
 * `limit` des appelants.
 *
 * `immutable_unaccent` rend la recherche insensible aux diacritiques —
 * « pokemon » trouve « Pokémon ». C'est un wrapper IMMUTABLE autour de
 * `unaccent`, seul indexable : l'expression doit être écrite exactement comme
 * dans l'index trigram de `card_translation`, sinon Postgres l'ignore.
 * Fonction et extensions sont créées par la migration `CatalogTranslations`
 * et par `SeedService.enableExtensions()`.
 */
export function applyCardSearch<T extends object>(
  qb: SelectQueryBuilder<T>,
  search: string,
  options: { alias?: string; detailsAlias?: string; setAlias?: string } = {},
): SelectQueryBuilder<T> {
  const alias = options.alias ?? "card";
  const details = options.detailsAlias ?? "pokemonDetails";
  const set = options.setAlias ?? "set";

  const conditions = [
    // Colonnes héritées de `card`, conservées le temps que toutes les données
    // soient passées par les traductions.
    `immutable_unaccent(${alias}.name) ILIKE immutable_unaccent(:cardSearch)`,
    `${alias}.rarity ILIKE :cardSearch`,
    `${alias}.localId ILIKE :cardSearch`,
    // L'illustrateur est un nom propre : il ne se traduit pas et reste sur `card`.
    `immutable_unaccent(${alias}.illustrator) ILIKE immutable_unaccent(:cardSearch)`,
    `immutable_unaccent(${set}.name) ILIKE immutable_unaccent(:cardSearch)`,
    `immutable_unaccent(${details}.description) ILIKE immutable_unaccent(:cardSearch)`,
    `EXISTS (
      SELECT 1 FROM card_translation ct
      WHERE ct.card_id = ${alias}.id
        AND (
          immutable_unaccent(ct.name) ILIKE immutable_unaccent(:cardSearch)
          OR immutable_unaccent(ct.description) ILIKE immutable_unaccent(:cardSearch)
        )
    )`,
  ];

  return qb.andWhere(`(${conditions.join(" OR ")})`, {
    cardSearch: `%${search}%`,
  });
}
