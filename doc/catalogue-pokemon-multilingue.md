# Plan — Catalogue Pokémon multilingue

> Statut : socle implémenté — reste le backfill `en`, la recherche et le web
> Périmètre : `apps/fetch`, `data/`, `apps/api`, `apps/web`
> Prérequis : le socle i18n web + API est en place (voir `internationalisation-web-api.md`)
> Langues du premier jalon : `fr` et `en`

## 1. Pourquoi ce chantier

L'interface, les emails, les notifications et les erreurs API sont traduits.
Le catalogue ne l'est pas : un utilisateur anglophone voit
« Bulbizarre », « Commune » et « Vampigraine ».

C'est le dernier pan monolingue, et le plus volumineux.

## 2. Constat mesuré

Chiffres relevés le 2026-08-12, à revérifier avant de démarrer.

| Élément | Valeur |
|---|---|
| Fichiers JSON dans `data/` | 20 222 |
| Poids de `data/` | 80 Mo |
| Séries stockées | 22 |
| Langue du scraper | `fr` en dur (`new TCGdex("fr")`) |

Couverture TCGdex par langue :

| Langue | Sets exposés |
|---|---:|
| `en` | 218 |
| `fr` | 200 |
| `it` | 190 |
| `es` | 154 |
| `de` | 153 |

### Trois vérifications déjà faites

**Les identifiants sont stables entre langues.** `base1-1` désigne la même
carte en `fr`, `en` et `de`. La correspondance est directe, sans table de
mapping — c'est le risque n°1 du plan initial, il est écarté.

```
GET /v2/fr/cards/base1-1 -> { id: "base1-1", localId: "1", name: "Alakazam", hp: 80 }
GET /v2/en/cards/base1-1 -> { id: "base1-1", localId: "1", name: "Alakazam", hp: 80 }
```

**Les champs linguistiques sont bien traduits**, y compris à l'intérieur des
structures JSON :

```
fr -> name: "Bulbizarre", category: "Pokémon", rarity: "Commune", attacks[0].name: "Vampigraine"
en -> name: "Bulbasaur",  category: "Pokemon", rarity: "Common",  attacks[0].name: "Leech Seed"
```

**Un set présent dans deux langues a le même nombre de cartes** (`sv08` :
252 des deux côtés). L'écart de couverture se joue au niveau des sets, pas
des cartes d'un set donné.

### Le point qui fait mal

**L'anglais a plus de sets que le français** (218 contre 200). Or le français
est aujourd'hui la source de vérité de `data/`. Migrer sans y penser reviendrait
à traiter comme « traduction » une langue plus complète que la référence.

## 3. Décisions prises

### 3.1 Langue canonique : aucune (option C)

`card`, `pokemon_set` et `pokemon_serie` ne portent que des données non
linguistiques. Chaque langue activée a sa ligne dans la table de traduction
correspondante ; aucune n'est privilégiée dans le schéma.

Les colonnes linguistiques actuelles (`card.name`, `card.image`, …) ne sont pas
supprimées : elles restent alimentées par la langue de repli tant que toutes les
lectures n'ont pas basculé. C'est ce qui rend chaque étape réversible.

### 3.2 Langues activées : `fr` et `en`

`de`/`es`/`it` restent hors périmètre tant que leur couverture n'a pas été
mesurée set par set (`npm run coverage-report`).

### 3.3 Stockage : dataset compressé publié sur R2

`data/` reste le tampon entre TCGdex et Postgres, mais change de forme et de
mode de distribution.

**Forme.** Un fichier NDJSON compressé Brotli par (langue, set), au lieu d'un
fichier JSON indenté par carte :

| | Avant | Après |
|---|---:|---:|
| Poids sur disque | 80 Mo | **2,7 Mo** par langue |
| Fichiers | 20 222 | 172 par langue |
| Lecture du catalogue complet | — | < 1 s |

Les 80 Mo tenaient surtout à l'éparpillement : 48,7 Mo de contenu réel, dont
19,3 Mo d'indentation, et 31 Mo perdus en blocs de système de fichiers sur
20 000 fichiers de 2 Ko. Le contenu utile compressé pèse 2,7 Mo.

**Distribution.** Le dataset est publié sur le bucket R2 déjà utilisé pour les
images, et récupéré par `npm run data:pull` depuis le domaine public — sans
credentials, sans transfert manuel, sur n'importe quel poste comme en
production. Un manifeste d'empreintes SHA-256 rend le pull incrémental : seuls
les fichiers modifiés sont retéléchargés.

Il n'est pas versionné dans git : le champ `pricing` change à chaque run, ce qui
gonflerait l'historique de plusieurs Mo par mise à jour.

## 4. Modèle de données cible

### 4.1 Séparer le canonique du linguistique

Champs actuels de `card` et `pokemon_card_details`, répartis :

**Non linguistiques — restent sur `card` / `pokemon_card_details`**

`tcgDexId`, `localId`, `variants`, `variantsDetailed`, `legal`, `pricing`,
`updated`, `set`, `game`, `hp`, `types`, `dexId`, `level`, `retreat`,
`weaknesses`, `resistances`, `regulationMark`, `illustrator`

> `illustrator` est un nom propre : il ne se traduit pas. `rarity` et
> `category`, en revanche, sont traduits par TCGdex (`Commune`/`Common`).

**Linguistiques — passent dans `card_translation`**

`name`, `image`, `category`, `rarity`, `description`, `effect`, `evolveFrom`,
`stage`, `suffix`, `item`, `abilities`, `attacks`

> **Correction du plan initial : `image` dépend de la langue.** Le texte de la
> carte est imprimé sur l'illustration et TCGdex sert une image par langue
> (`assets.tcgdex.net/fr/base/base1/1` contre `/en/base/base1/1`). Les logos et
> symboles de sets et de séries sont dans le même cas.

### 4.2 Schéma

```
card_translation
- card_id            FK -> card.id, ON DELETE CASCADE ┐ clé primaire
- locale             varchar(10)                      ┘ composite
- name, image, category, rarity
- description, effect, evolve_from, stage, suffix
- item, abilities, attacks        jsonb
- source_updated_at
- index(locale, name)
```

La clé primaire composite `(card_id, locale)` remplace le couple
`id` + `unique(card_id, locale)` du plan initial : l'unicité devient
structurelle et la table pèse une colonne de moins sur 40 000 lignes.

S'ajoute un index unique `(game, tcgDexId)` sur `card` : c'est lui qui garantit
qu'un import dans une nouvelle langue ne dupliquera jamais une carte, donc ne
détachera jamais un deck, une collection ou une annonce.

Même principe pour `pokemon_set_translation` (nom du set) et
`pokemon_series_translation` (nom de la série).

### 4.3 Volumétrie attendue

~20 000 cartes × 2 langues = **40 000 lignes** dans `card_translation`, et
`data/` passe de 80 Mo à ~160 Mo. Rien d'inquiétant pour Postgres, mais le
temps de seed double : à mesurer avant de lancer en production.

## 5. Refonte du microservice `apps/fetch`

C'est le cœur du chantier, et le plus gros écart avec l'existant.

### 5.1 Ce qui bloque aujourd'hui

`update-data.ts` :

```ts
const tcgdex = new TCGdex("fr");                    // langue en dur
const setDir = path.join(serieDir, set.id);         // pas de dimension langue
fs.writeFileSync(path.join(setDir, `${cardRef.id}.json`), ...)
```

Trois problèmes :

1. **La langue est figée** à l'instanciation du SDK.
2. **L'arborescence n'a pas de dimension langue** :
   `data/<serieId>/<setId>/<cardId>.json`.
3. **La détection du neuf se fait sur l'ID de set** : un set déjà connu en `fr`
   sera considéré comme traité et jamais récupéré en `en`.

### 5.2 Arborescence cible

```
data/
├── <locale>/
│   ├── pokemon_series.json
│   ├── pokemon_sets.json
│   └── <serieId>/<setId>/<cardId>.json
└── shared/
    └── images/          (les images ne dépendent pas de la langue)
```

Alternative si la migration de l'existant est jugée trop risquée : garder
`data/` tel quel pour `fr` et ajouter `data/en/`. C'est laid mais réversible.
Trancher explicitement.

### 5.3 Chantiers sur le scraper

1. **Paramétrer la langue** : `LOCALES=fr,en` en variable d'environnement,
   une instance de SDK par langue.
2. **Boucler par langue** sur séries, sets et cartes.
3. **Rendre la détection du neuf sensible à la langue** : l'état « déjà
   récupéré » devient une paire `(setId, locale)`.
4. **Ne uploader les images qu'une fois** : elles ne dépendent pas de la
   langue, on les traite sur la langue de référence uniquement.
5. **Tolérer l'absence** : un set ou une carte absent dans une langue ne doit
   pas interrompre le run — journaliser et continuer.
6. **Produire un rapport de couverture** en fin de run :
   `fr: 200/218 sets, 19 843/20 222 cartes` — c'est la métrique qui pilotera
   l'activation d'une langue.
7. **Limiter la concurrence** : le script fait aujourd'hui `await` séquentiel
   avec 100 ms de pause. Multiplié par 2 langues et 20 000 cartes, cela fait
   ~1 h par langue. Envisager un pool de 3–5 requêtes parallèles, en
   surveillant le rate limiting TCGdex.
8. **Reprise sur échec** : le script sauve `pokemon_sets.json` après chaque set
   traité — conserver ce comportement, par langue.

### 5.4 Scripts à ajouter

| Script | Rôle |
|---|---|
| `npm run update-data -- --locale=en` | Récupère une langue précise |
| `npm run backfill-locale -- --locale=en` | Rattrape une langue sur les sets déjà connus |
| `npm run coverage-report` | Compare les langues set par set, sans rien écrire |

## 6. Import en base

### 6.1 Le bug à corriger en priorité

`seed.service.ts` applique `cleanString()` aux champs affichés :

```ts
cleanString(str: string): string {
  return str.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
}
```

Appliqué à `name`, `illustrator`, `description`, `evolveFrom`, `effect`
(lignes ~477-489). **Cette normalisation détruit les accents** : « Pokémon »
devient « Pokemon », « Étincelles » devient « Etincelles ».

C'est un bug indépendant du multilingue, qui dégrade déjà l'affichage
français. À corriger séparément, avant le reste.

Attention : `normalizeForMapping()` utilise le même procédé mais pour
**comparer** des valeurs (`mapPokemonCategory`, `mapTrainerType`). Cet usage-là
est légitime et doit être conservé — ne pas supprimer la fonction, seulement
cesser de l'appliquer aux valeurs stockées.

### 6.2 Import multilingue

- lire `data/<locale>/…` pour chaque langue activée ;
- upsert de `card` sur les champs non linguistiques (une seule fois) ;
- upsert de `card_translation` par `(card_id, locale)` ;
- ne jamais supprimer une traduction existante parce qu'une langue est absente
  d'un run.

## 7. API

### 7.1 Résolution de la locale

Les endpoints carte, set et série lisent `Accept-Language` (déjà envoyé par le
web) et retournent une vue résolue :

```
traduction demandée -> langue de repli -> null
```

Le web n'a pas à connaître l'existence des tables de traduction : il reçoit une
carte avec un `name` déjà résolu.

Prévoir un paramètre `?withTranslations=true` pour l'administration, qui
retourne toutes les variantes.

### 7.2 Endpoints concernés

`/cards`, `/cards/:id`, `/pokemon-sets`, `/pokemon-series`, `/search`, et tout
ce qui renvoie une carte imbriquée : listings marketplace, éléments de
collection, cartes de deck. **C'est le point le plus sous-estimé du chantier** :
la carte apparaît dans beaucoup de payloads.

## 8. Recherche et index

La recherche porte aujourd'hui sur `card.name`. Après migration :

- rechercher dans `card_translation.name` pour la locale demandée ;
- inclure la langue de repli si aucun résultat ;
- **conserver la recherche par `localId`, `tcgDexId` et SKU**, qui ne dépend
  d'aucune langue ;
- index sur `(locale, name)` ;
- décider explicitement du comportement accents/casse — un utilisateur qui
  tape « pokemon » doit trouver « Pokémon » (`unaccent` ou index d'expression).

Mesurer les temps de réponse avant et après : la recherche passe d'une table à
une jointure.

## 9. Migration des données existantes

1. Créer les tables de traduction (migration additive, aucune lecture modifiée).
2. Copier les valeurs actuelles de `card` vers `card_translation` en `fr`.
3. Lancer le backfill `en` du scraper, puis l'import.
4. Basculer les lectures derrière un flag.
5. Vérifier les comptes et quelques cartes témoins dans les deux langues.
6. **Beaucoup plus tard**, supprimer les colonnes linguistiques de `card`.

Ne pas supprimer les anciennes colonnes dans la même PR que la bascule : c'est
ce qui rend le retour arrière possible.

## 10. Tests

- correspondance des IDs entre langues sur un échantillon de sets anciens et
  récents ;
- une carte sans traduction reste affichable ;
- les accents survivent à l'import (test de non-régression sur `cleanString`) ;
- decks, collections et listings pointent toujours la même carte après
  migration — **aucun doublon** ;
- recherche par nom dans les deux langues, et par `localId` ;
- idempotence du scraper : deux runs consécutifs ne changent rien.

## 11. Risques

| Risque | Probabilité | Impact | Mesure |
|---|:---:|:---:|---|
| Doublons de cartes cassant decks/collections | Faible | Critique | Entité canonique unique, jamais dupliquée par langue |
| Couverture `en` incomplète sur les vieux sets | Moyenne | Moyen | Repli et rapport de couverture avant activation |
| Rate limiting TCGdex sur un run x2 | Moyenne | Moyen | Pool limité, reprise sur échec |
| Recherche plus lente après jointure | Moyenne | Moyen | Index `(locale, name)`, benchmark avant/après |
| Perte des accents à l'import | **Avérée** | Élevé | Corriger `cleanString` avant tout le reste |
| Set présent en `en` mais absent en `fr` | Avérée | Moyen | Le canonique ne doit pas dépendre d'une langue (option C) |

## 12. État d'avancement

### Fait

| Étape | Ce qui a été livré |
|---|---|
| Accents | `cleanString` ne détruit plus les caractères non-ASCII, dans `seed.service` **et** `card-sync.service` qui portait le même bug. Test de non-régression. |
| Dataset | `@repo/pokemon-dataset` : format NDJSON+Brotli, manifeste, résolution de `data/`. Partagé par `apps/fetch` et `apps/api`. |
| Distribution | `data:pull` (public, incrémental) et `data:push` (mainteneur). `data:migrate-layout` a converti l'existant : 19 424 cartes, 2,7 Mo. |
| Scraper | Langues paramétrables, état « déjà récupéré » par `(setId, locale)`, pool de 5 requêtes, tolérance aux absences, `coverage-report`. |
| Modèle | Trois tables de traduction, index unique `(game, tcgDexId)`, migration additive qui recopie l'existant en `fr`. |
| Import | `CatalogImportService` : upsert des entités et des traductions, idempotent, ~6 s pour 19 424 cartes. `npm run import:catalog`. |
| API | Résolution de la langue via `Accept-Language`, appliquée par un intercepteur global — donc aussi aux cartes imbriquées dans les listings, collections et decks. |
| Recherche | `applyCardSearch` interroge `card_translation` toutes langues confondues, via `EXISTS` pour ne pas fausser les `limit`, et `unaccent` pour ignorer les diacritiques. Branché sur `card.service`, `search.service` et `pokemon-card.service`. |
| Recherche | `applyCardSearch` interroge `card_translation` par `EXISTS`, toutes langues confondues, avec `unaccent` : « etincelles » trouve « Étincelles Déferlantes », « Charizard » trouvera « Dracaufeu ». |

Vérifié de bout en bout : `Accept-Language: en` renvoie le nom, l'image et la
description anglais ; `de` retombe sur la langue par défaut ; chercher
« Charizard » trouve Dracaufeu, « zenith » trouve le set « Zénith Suprême ».
Les 875 tests de l'API passent.

### Reste à faire

1. **Backfill `en`** — `npm run update-data -- --locale=en` puis `data:push`.
   Opération longue (~20 000 cartes) et qui écrit sur R2 : à lancer
   volontairement. Vérifier la couverture avant d'activer la langue côté web.
2. **`?withTranslations=true`** pour l'administration (§7.1).
3. **Sets et séries** — l'intercepteur ne traduit aujourd'hui que les cartes ;
   les noms de sets et de séries lisent encore les colonnes héritées.
4. **Recherche dans `pokemon-card.service`** — `applyCardSearch` couvre
   `card.service` et `search.service` ; vérifier les autres points d'entrée.
5. **Nettoyage** — supprimer les colonnes linguistiques de `card`,
   `pokemon_set` et `pokemon_serie`, bien après la bascule des lectures.

### Points relevés en route

- **Les images dépendent de la langue** : le plan les classait à tort comme
  non linguistiques (voir §4.1).
- **795 cartes Pokémon Pocket** avaient échappé au filtre de l'ancien scraper.
  Elles sont exclues du dataset, mais restent en base : les supprimer est une
  opération distincte, à faire en vérifiant les collections et decks qui les
  référencent.
- `cleanString` a dégradé les accents de toutes les cartes déjà en base ;
  `npm run import:catalog` les restaure depuis le dataset.

## 14. Références

- [TCGdex — statut des traductions](https://tcgdex.dev/status)
- [TCGdex — codes de langue](https://tcgdex.dev/errors/language-invalid)
- `apps/fetch/README.md` — pipeline actuel et scripts R2
- `doc/internationalisation-web-api.md` — plan général, phases 1 à 6
