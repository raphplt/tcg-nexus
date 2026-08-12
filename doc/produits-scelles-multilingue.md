# Plan — Produits scellés multilingues

> Statut : à faire, après le chantier `catalogue-pokemon-multilingue.md`
> Périmètre : `apps/fetch`, `apps/api`, `apps/web`, `data/`
> Langues visées : `fr` et `en`

## 1. Pourquoi ce chantier

Le catalogue de cartes est multilingue : `card`, `pokemon_set` et `pokemon_serie`
ne portent plus aucun libellé, tout vit dans les tables de traduction, et
l'API résout la langue de la requête.

Les produits scellés — boosters, ETB, coffrets, displays — ont été traités à
moitié. Ils ont bien une table `sealed_product_locale`, mais le modèle et le
pipeline sont restés monolingues. Un anglophone voit « Aventures Ensemble -
Coffret Dresseur ».

## 2. État mesuré

Chiffres relevés le 2026-08-12 sur `data/sealed_products.json` et la base locale.

| Élément | Valeur |
|---|---|
| Produits scellés | 1 288 |
| Lignes dans `sealed_product_locale` | 1 288, **toutes en `fr`** |
| Traductions `en` | **0** |
| Source | Pokecardex (scraping Puppeteer), site francophone |
| Poids de `data/sealed_products.json` | 372 Ko, structure monolingue |

### Ce qui est déjà fait

| Aspect | État |
|---|---|
| Table de traduction `sealed_product_locale` | ✅ existe (id auto, `(sealed_product_id, locale)` unique) |
| Résolution API par langue | ✅ `CatalogLocalizationService` pose `name`, repli sur `nameEn` |
| Recherche multilingue et sans accents | ✅ `sealedProductNameMatchesSql` + `immutable_unaccent` |
| Tri marketplace par nom localisé | ✅ `localizedSealedNameSql` |
| `?withTranslations=true` | ✅ étendu aux produits scellés |

### Ce qui manque

| Aspect | État | Écart avec les cartes |
|---|---|---|
| Colonne linguistique en dur | ❌ `nameEn` toujours sur l'entité | supprimée côté cartes |
| Contenu des traductions `en` | ❌ aucune donnée | 4 795 cartes traduites |
| Dataset par langue | ❌ un seul fichier monolingue | `data/<locale>/` |
| Scraper multilingue | ❌ Pokecardex uniquement | `--locale=en` sur TCGdex |
| Web | ❌ lit `nameEn` par endroits | lit `name` résolu |
| Tests | ❌ aucun `*.spec.ts` | couverts |

## 3. Le point qui fait mal

**Il n'existe aucune source de traduction anglaise.** Pokecardex est
francophone, et TCGdex — qui alimente les cartes en `fr` et `en` — ne couvre pas
les produits scellés. Contrairement au chantier cartes, on ne peut pas se
contenter de rescraper avec `--locale=en`.

Pire, le champ s'appelle `nameEn` mais **contient du français** : il porte le nom
brut de la source, pas une traduction. Toute la logique actuelle repose donc sur
un faux ami.

## 4. La piste réaliste : composer plutôt que traduire

Analyse des 1 288 noms :

| Constat | Volume |
|---|---:|
| Noms de la forme `{nom du set} - {suffixe}` | 805 (62 %) |
| Noms commençant par le nom du set | 813 (63 %) |
| Suffixes distincts | **288** |
| Noms sans suffixe | 483 |

Deux de ces trois composants sont **déjà traduisibles sans nouvelle source** :

1. **le nom du set** vit dans `pokemon_set_translation`, déjà rempli en `fr` et
   en `en` par le chantier cartes ;
2. **le suffixe** appartient à un vocabulaire fermé de 288 valeurs — dont
   beaucoup sont déjà anglaises (`Elite Trainer Box`, `Portfolio A4`) et
   seulement 24 contiennent des accents.

Traduire 288 suffixes à la main est faisable ; traduire 1 288 noms ne l'est pas.

Restent les 483 noms libres, qui contiennent souvent des noms de Pokémon
français (« Collection Illustration Spécial Amphinobi », « Box EUArtikodin »).
Ceux-là ne se composent pas : ils resteront en repli français jusqu'à traduction
manuelle, ou seront traités au cas par cas.

**Couverture attendue : ~63 % automatiquement, le reste en repli assumé.**

## 5. Décisions à prendre avant de coder

### 5.1 Supprime-t-on `nameEn` ?

| Option | Conséquence |
|---|---|
| **A. Supprimer** | Cohérent avec les cartes : aucune langue privilégiée. Touche le DTO, le contrôleur admin, 5 fichiers web. Un produit sans traduction n'a plus de nom du tout. |
| **B. Le renommer `sourceName`** | Honnête sur son contenu, moins de casse, mais garde un libellé hors table de traduction. |
| **C. Le garder tel quel** | Incohérent, et le nom ment sur son contenu. |

Recommandation : **A**, avec migration de son contenu vers `sealed_product_locale`
en `fr` (déjà le cas pour les 1 288 lignes existantes).

### 5.2 L'image est-elle linguistique ?

En réalité oui — le packaging est traduit. Mais Pokecardex ne fournit que les
visuels français, et il n'y a pas de source anglaise. Proposition : la laisser
sur `sealed_product`, avec un commentaire explicite, et la déplacer le jour où
une source anglaise existera.

### 5.3 Où stocke-t-on le dataset ?

Aligner sur les cartes : `data/<locale>/sealed-products.json` plutôt qu'un
`data/sealed_products.json` à la racine. Le fichier reste versionné.

## 6. Modèle cible

```
sealed_product                       (non linguistique)
- id, product_type, pokemon_set_id, contents, sku, upc, image
- (plus de nameEn)

sealed_product_locale                (linguistique, une ligne par langue)
- sealed_product_id, locale, name
- clé primaire composite (sealed_product_id, locale)  ← remplace l'id auto
- index trigram sur immutable_unaccent(name)
```

La clé primaire composite aligne la table sur `card_translation` et supprime
l'`id` auto-généré, qui n'apporte rien et complique la résolution (voir
`loadSealedProductNames`, obligé de passer par un query builder).

## 7. Découpage en pull requests

| # | Contenu | Dépend de |
|---|---|---|
| 1 | **Renommer les suffixes en catalogue traduisible** : extraire les 288 suffixes dans `packages/pokemon-dataset` ou un fichier de messages, avec leur traduction `en`. Livrable seul, sans effet de bord. | — |
| 2 | **Composition des noms** : service qui construit `{set traduit} - {suffixe traduit}` et remplit `sealed_product_locale` en `en` pour les 63 % éligibles. Idempotent, journalise les non-couverts. | 1, traductions `en` des sets |
| 3 | **Modèle** : clé primaire composite sur `sealed_product_locale`, index trigram, suppression de `nameEn` (migration + entité + DTO). | 2 |
| 4 | **Dataset par langue** : `data/<locale>/sealed-products.json`, adaptation de `update-sealed.ts` et du seed. | 3 |
| 5 | **Web** : remplacer les lectures de `nameEn` par `name` résolu par l'API ; `getSealedName()` devient inutile. | 3 |
| 6 | **Tests** : résolution par langue, repli, recherche sans accents, composition des noms. | 2, 3 |

Chaque PR doit rester déployable et conserver l'affichage français.

### Fichiers web à reprendre (PR 5)

- `apps/web/utils/sealedImage.ts` — `getSealedName()` à supprimer
- `apps/web/types/sealed-product.ts` — retirer `nameEn`
- `apps/web/app/[locale]/(main)/marketplace/sealed/[id]/page.tsx`
- `apps/web/app/[locale]/(main)/marketplace/sellers/[id]/page.tsx`
- `apps/web/app/[locale]/(main)/pokemon/mini-games/juste-prix/page.tsx`
- `apps/web/components/Home/SealedProductsPreview.tsx`

## 8. Tests

- un produit traduit renvoie son nom `en` sous `Accept-Language: en` ;
- un produit non traduit retombe sur le français, sans champ vide ;
- la recherche « origines » trouve « Origines Antiques » (sans accent) ;
- la recherche trouve un produit par son nom anglais comme par son nom français ;
- la composition produit le bon nom pour un cas `{set} - {suffixe}` et laisse
  intact un nom libre ;
- `?withTranslations=true` liste bien les deux langues ;
- idempotence : deux passes de composition ne créent pas de doublon.

## 9. Risques

| Risque | Probabilité | Impact | Mesure |
|---|:---:|:---:|---|
| Noms composés maladroits en anglais | Moyenne | Moyen | Relire un échantillon avant d'activer ; journaliser les cas non couverts |
| 37 % de produits sans traduction | **Avérée** | Moyen | Repli français assumé et documenté côté produit |
| Suppression de `nameEn` cassant le web | Moyenne | Élevé | PR 5 juste après la PR 3, pas avant |
| Pokecardex change de structure | Faible | Élevé | Le scraping existe déjà, ce chantier ne l'aggrave pas |
| Images uniquement françaises | Avérée | Faible | Documenté ; déplacement le jour où une source existe |

## 10. Ce qu'il faut décider avant la première ligne de code

- [ ] `nameEn` : supprimé (option A), renommé (B) ou conservé (C) ?
- [ ] Qui relit les 288 suffixes traduits ?
- [ ] Accepte-t-on 37 % de produits en repli français, ou faut-il une passe
      manuelle sur les 483 noms libres ?
- [ ] L'image reste-t-elle non linguistique ?

## 11. Références

- `doc/catalogue-pokemon-multilingue.md` — chantier cartes, même modèle
- `apps/api/src/card/catalog-localization.service.ts` — résolution partagée
- `apps/api/src/card/card-search.ts` — fragments SQL multilingues
- `apps/fetch/update-sealed.ts`, `apps/fetch/pokecardex.service.ts` — pipeline actuel
