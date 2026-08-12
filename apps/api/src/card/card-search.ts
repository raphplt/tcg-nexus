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
 * `unaccent` rend la recherche insensible aux diacritiques — « pokemon » trouve
 * « Pokémon ». L'extension est créée par `SeedService.enableExtensions()`.
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
    `unaccent(${alias}.name) ILIKE unaccent(:cardSearch)`,
    `${alias}.rarity ILIKE :cardSearch`,
    `${alias}.localId ILIKE :cardSearch`,
    // L'illustrateur est un nom propre : il ne se traduit pas et reste sur `card`.
    `unaccent(${alias}.illustrator) ILIKE unaccent(:cardSearch)`,
    `unaccent(${set}.name) ILIKE unaccent(:cardSearch)`,
    `unaccent(${details}.description) ILIKE unaccent(:cardSearch)`,
    `EXISTS (
      SELECT 1 FROM card_translation ct
      WHERE ct.card_id = ${alias}.id
        AND (
          unaccent(ct.name) ILIKE unaccent(:cardSearch)
          OR unaccent(ct.description) ILIKE unaccent(:cardSearch)
        )
    )`,
  ];

  return qb.andWhere(`(${conditions.join(" OR ")})`, {
    cardSearch: `%${search}%`,
  });
}
