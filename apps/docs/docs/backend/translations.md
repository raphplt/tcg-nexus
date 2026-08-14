---
title: Traductions
---

Le système d'internationalisation couvre deux besoins distincts : les **textes de l'interface** (dictionnaires du front) et les **données du catalogue** (nom d'une carte, d'un set, d'un produit scellé — qui varient par langue). Langues supportées : `fr` (défaut) et `en` (`SUPPORTED_LOCALES`, `translation/supported-locales.ts` — doit rester aligné avec `apps/web/i18n/config.ts`).

## Dictionnaires d'interface (`/translations`)

- **Base path** : `/translations`
- `GET /translations` (public, `locale` optionnel) : renvoie les overrides groupés par locale. Lu par le web à chaque rafraîchissement de son cache de messages, en complément des dictionnaires versionnés (`apps/web/messages/{en,fr}.json`).
- `PUT /translations` (ADMIN) : upsert d'entrées `{ locale, key, value }`. **Une valeur vide supprime l'override** — la clé retombe alors sur le dictionnaire du dépôt plutôt que d'afficher du vide.

Entité `Translation` (table `translation`, unique sur `(locale, key)`) : seules les clés effectivement modifiées depuis l'administration y sont stockées, pas la totalité du dictionnaire.

## Traduction du catalogue

Chaque entité du catalogue qui a un nom (`Card`, `PokemonSet`, `PokemonSerie`, `SealedProduct`) a une table de traduction associée (`CardTranslation`, `PokemonSetTranslation`, `PokemonSerieTranslation`, `SealedProductLocale`), clé composite `(idEntité, locale)`. Aucune langue n'est canonique : les champs non linguistiques (identifiants, HP, prix…) restent sur l'entité, tout le reste vit dans la ligne de traduction — y compris l'**image** d'une carte, TCGdex servant une image par langue.

### Résolution automatique — `CatalogLocalizationInterceptor`

La grande majorité des endpoints qui renvoient des cartes/sets/séries/produits scellés (`pokemon-card`, `pokemon-set`, `pokemon-series`, `marketplace`, `collection`, `deck`, `scan`, `search`) **n'implémentent aucune logique de traduction eux-mêmes**. Un interceptor global (`CatalogLocalizationInterceptor`, câblé dans `app.module.ts`) parcourt chaque payload de réponse après coup, repère les entités catalogue (par leur classe TypeORM réelle) et leur attache `name`/`image`/… dans la langue de la requête via `CatalogLocalizationService`.

Deux façons de fixer la locale d'une requête :

- Header `Accept-Language` (ex. `fr-FR,fr;q=0.9,en;q=0.8`) — seul le préfixe de langue est comparé, la variante régionale est ignorée. C'est ce que lit le décorateur `@RequestLocale()` utilisé explicitement par certains endpoints (ex. `GET /collection/:id/rarities`).
- À défaut de header reconnu, `DEFAULT_LOCALE` (`fr`) est utilisé.

Pour du code interne (hors requête HTTP, ex. notifications), `CatalogLocalizationService.resolveLabels` peut être appelé directement avec une locale explicite.

## Préférence utilisateur

`User.preferredLocale` (`varchar(10)`, défaut `fr`) stocke la langue préférée de chaque compte, réglable via `PATCH /users/me`.

## Emails et notifications

Les emails transactionnels (`MailI18nService`) et les notifications (`NotificationI18nService`) ne stockent pas de texte figé : une notification récente porte `translationKey` + `data` (paramètres), résolus au moment de l'affichage/envoi dans la langue du destinataire. Voir [Notifications](./notifications).
