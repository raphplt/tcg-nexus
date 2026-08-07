# Plan d'internationalisation de TCG Nexus — Web et API

> Statut : proposition d'implémentation  
> Périmètre : `apps/web` et `apps/api`  
> Hors périmètre initial : application mobile  
> Langues du premier jalon : français (`fr`) et anglais (`en`)  
> Locale par défaut : français (`fr`)

## 1. Résumé exécutif

L'internationalisation de TCG Nexus est techniquement faisable sans réécriture du web ou de l'API. Le chantier doit toutefois être séparé en plusieurs couches :

1. routage et traduction de l'interface web ;
2. négociation et persistance de la locale ;
3. stabilisation des erreurs de l'API avec des codes indépendants de la langue ;
4. localisation des emails et notifications générés côté serveur ;
5. traduction des contenus système stockés en base ;
6. adaptation du catalogue Pokémon et de sa synchronisation TCGdex ;
7. SEO international, tests et déploiement progressif.

Le premier incrément exploitable peut fournir une interface française/anglaise et une API compatible i18n tout en conservant temporairement le catalogue Pokémon en français avec un mécanisme de fallback.

### Estimation globale

| Périmètre | Estimation |
|---|---:|
| Socle web et API, sans traduction complète du catalogue | 18 à 25 jours-développeur |
| Périmètre complet, catalogue et contenus compris | 35 à 50 jours-développeur |
| Durée indicative pour une personne | 7 à 10 semaines |

Ces estimations n'incluent pas le temps de traduction, de relecture linguistique ou de validation juridique des contenus.

## 2. Objectifs

### 2.1 Objectifs fonctionnels

- Permettre à un visiteur de consulter le web en français ou en anglais.
- Permettre à un utilisateur authentifié d'enregistrer sa langue préférée.
- Conserver la langue lors des navigations, connexions, déconnexions et redirections.
- Présenter les dates, nombres, pluriels et montants selon la locale active.
- Fournir des métadonnées SEO et des URL distinctes par langue.
- Localiser les erreurs affichées par le web sans rendre le contrat API dépendant d'un texte.
- Envoyer les emails et notifications serveur dans la langue du destinataire.
- Retourner les contenus système et le catalogue dans la langue demandée lorsque la traduction existe.
- Appliquer un fallback prévisible lorsque la traduction n'existe pas.

### 2.2 Objectifs techniques

- Utiliser des codes de locale BCP 47 simples et normalisés.
- Garder les identifiants métier, enums et contrats de données indépendants de la langue.
- Centraliser les traductions et le formatage.
- Éviter de charger tous les dictionnaires dans le bundle client.
- Préserver la compatibilité des clients existants pendant la migration.
- Rendre les traductions testables et détecter les clés manquantes en CI.
- Permettre l'ajout ultérieur d'une troisième langue sans refonte.

## 3. Hors périmètre

Le premier chantier ne comprend pas :

- l'application mobile ;
- la traduction automatique des contenus écrits par les utilisateurs ;
- la conversion automatique des devises en fonction de la langue ;
- la localisation des identifiants techniques ou des valeurs d'enums stockées en base ;
- la traduction des logs techniques ;
- la localisation des slugs métier lors du premier incrément ;
- un back-office complet de gestion éditoriale des traductions ;
- la traduction exhaustive immédiate de toutes les cartes dans toutes les langues TCGdex.

La langue et la devise doivent rester deux préférences séparées. Un utilisateur anglophone peut, par exemple, conserver l'euro.

## 4. État initial constaté

### 4.1 Web

- Next.js 16 avec App Router.
- 59 pages et 4 layouts.
- 388 fichiers TypeScript/TSX, dont 175 composants client.
- Environ 248 fichiers contiennent du texte français destiné à l'utilisateur.
- La balise `<html>` est fixée à `lang="fr"`.
- Les métadonnées racine et Open Graph sont uniquement françaises.
- Le sitemap ne contient qu'une URL par route.
- Aucun framework i18n n'est installé.
- Plusieurs dizaines de dates et montants utilisent explicitement `fr-FR`.
- De nombreux labels d'enums et de statuts sont déclarés localement dans les composants.
- Plus de 200 navigations internes utilisent directement des chemins absolus sans locale.
- Le proxy Next.js réalise déjà les contrôles d'authentification et les redirections.
- La préférence de devise existe côté web et côté API.

### 4.2 API

- NestJS 11 et TypeORM.
- Le filtre global d'exceptions retourne des messages français.
- Des erreurs métier sont écrites en français et en anglais selon les modules.
- Les réponses d'erreur ne possèdent pas de code métier stable.
- Les validations `class-validator` exposent potentiellement des textes dépendants de la bibliothèque.
- Les emails Handlebars sont écrits en français.
- Les notifications sont persistées sous forme de `title` et `body` déjà rendus.
- La préférence utilisateur ne contient pas de locale.
- Les montants des notifications sont formatés avec `fr-FR`.

### 4.3 Données métier

- Les FAQ, articles, badges, challenges et états de carte n'ont qu'une version linguistique.
- Les produits scellés possèdent déjà une relation `SealedProductLocale` utilisable comme premier modèle.
- Le catalogue TCGdex est synchronisé avec un client configuré en français.
- Les noms, descriptions, attaques et talents de cartes sont stockés directement sur les entités principales.
- Une partie de l'import supprime les accents et caractères non ASCII.
- TCGdex propose plusieurs langues, avec des niveaux de complétude variables.

## 5. Décisions d'architecture proposées

### 5.1 Bibliothèque web

Utiliser `next-intl` pour :

- les dictionnaires ICU ;
- les Server Components et Client Components ;
- les pluriels et interpolations ;
- le formatage des dates, nombres et listes ;
- les helpers de navigation conscients de la locale ;
- la génération de métadonnées localisées.

Alternative minimale : dictionnaires maison chargés dans les Server Components. Cette option réduit les dépendances, mais demanderait de réimplémenter la navigation, le contexte client, ICU, la validation des locales et une partie du formatage. Elle n'est pas recommandée pour le volume actuel.

### 5.2 Stratégie d'URL

Utiliser un préfixe explicite pour toutes les langues :

```text
/fr
/fr/pokemon
/fr/marketplace
/en
/en/pokemon
/en/marketplace
```

Avantages :

- URL canonique non ambiguë ;
- partage d'une URL dans une langue déterminée ;
- indexation SEO distincte ;
- comportement uniforme entre locale par défaut et locales secondaires ;
- simplification des alternates `hreflang`.

Les anciennes URL sans préfixe seront redirigées vers la meilleure locale disponible.

### 5.3 Locales supportées

Créer une définition partagée et fermée :

```ts
export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "fr";
```

Ne pas accepter une locale arbitraire dans les requêtes ou en base. Une nouvelle langue doit être ajoutée explicitement aux locales supportées.

### 5.4 Résolution de la locale

Ordre de priorité proposé :

1. segment d'URL valide ;
2. préférence `preferredLocale` de l'utilisateur authentifié ;
3. cookie `NEXT_LOCALE` ;
4. en-tête `Accept-Language` ;
5. `fr`.

Une fois sur une URL localisée, le segment d'URL est la source de vérité pour le rendu web. La préférence utilisateur et le cookie servent à choisir la langue lors de l'arrivée ou d'une URL sans préfixe.

### 5.5 Contrat de locale entre web et API

Le web envoie la locale active dans :

```http
Accept-Language: en
```

L'API valide la langue contre la liste supportée. Les tâches asynchrones, emails et notifications ne doivent pas dépendre d'un contexte HTTP : elles utilisent la préférence persistée du destinataire.

### 5.6 Politique de fallback

Politique commune proposée :

```text
traduction demandée -> français -> valeur canonique -> clé technique contrôlée
```

Exemples :

- une FAQ anglaise manquante retourne temporairement la version française ;
- une carte sans traduction anglaise conserve son libellé français ;
- une clé d'interface manquante est une erreur en développement et en CI ;
- une clé manquante en production affiche un fallback contrôlé et produit une métrique.

## 6. Architecture web cible

### 6.1 Organisation des routes

Structure cible indicative :

```text
apps/web/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/
│   │   ├── (main)/
│   │   └── (match)/
│   ├── sitemap.ts
│   └── robots.ts
├── i18n/
│   ├── routing.ts
│   ├── request.ts
│   ├── navigation.ts
│   └── config.ts
└── messages/
    ├── fr.json
    └── en.json
```

Le déplacement des groupes de routes sous `[locale]` ne doit pas modifier les URL métier après le segment de langue.

### 6.2 Proxy et authentification

Le proxy doit réaliser, dans l'ordre :

1. exclusion des assets, endpoints API et fichiers statiques ;
2. validation ou détection de locale ;
3. redirection vers l'URL localisée si nécessaire ;
4. normalisation du pathname sans locale pour tester les routes protégées ;
5. contrôle ou rafraîchissement de l'authentification ;
6. redirection localisée vers la connexion ou l'accueil ;
7. conservation des query params et du chemin de retour.

Exemple :

```text
/marketplace -> /fr/marketplace
/en/orders -> route protégée
/en/orders non authentifié -> /en/auth/login?redirect=/en/orders
```

Les constantes `PROTECTED_ROUTES` restent exprimées sans locale. Une fonction centrale retire le segment de langue avant comparaison.

### 6.3 Navigation

Créer et utiliser exclusivement les wrappers localisés :

```ts
export { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

Migrer progressivement :

- les imports `next/link` ;
- les imports `next/navigation` ;
- les `router.push` et `router.replace` ;
- les redirections dans les contextes d'authentification ;
- les liens reçus dans les notifications ;
- les breadcrumbs et menus.

Éviter de préfixer manuellement les chemins avec `/${locale}` dans les composants.

### 6.4 Dictionnaires

Organiser les clés par domaine fonctionnel :

```json
{
  "Common": {},
  "Navigation": {},
  "Auth": {},
  "Marketplace": {},
  "Collection": {},
  "Decks": {},
  "Tournaments": {},
  "Play": {},
  "Profile": {},
  "Settings": {},
  "Admin": {},
  "Errors": {}
}
```

Règles :

- préférer des clés sémantiques, par exemple `Marketplace.checkout.emptyCart` ;
- ne pas utiliser la phrase française comme clé ;
- ne pas concaténer des fragments traduits ;
- utiliser ICU pour les pluriels et variables ;
- conserver les contenus riches sous forme de messages structurés ;
- ne pas inclure de JSX dans les fichiers JSON ;
- documenter les variables nécessaires au traducteur.

Exemple :

```json
{
  "cartItems": "{count, plural, =0 {Aucun article} one {# article} other {# articles}}"
}
```

### 6.5 Formatage

Créer un module ou des hooks communs pour :

- `formatDate` ;
- `formatDateTime` ;
- `formatRelativeTime` ;
- `formatNumber` ;
- `formatPercent` ;
- `formatCurrency` ;
- `formatList`.

Supprimer progressivement :

- les `toLocaleDateString("fr-FR")` ;
- les `toLocaleString("fr-FR")` ;
- les imports statiques de `date-fns/locale/fr` ;
- les symboles monétaires écrits dans les textes ;
- les formats `dd/MM/yyyy` présentés directement à l'utilisateur.

Les formats techniques de formulaires et de contrats API restent ISO 8601.

### 6.6 Formulaires et validations

- Conserver les schémas Zod indépendants de la langue lorsque possible.
- Générer les messages de validation depuis le composant ou une factory recevant `t`.
- Traduire les placeholders, aides, labels, erreurs et confirmations.
- Vérifier les contraintes qui dépendent de la longueur d'une traduction.
- Ne pas comparer une valeur métier à un label traduit.

### 6.7 Métadonnées et SEO

Pour chaque page publique indexable :

- générer `title` et `description` selon la locale ;
- définir `openGraph.locale` et `openGraph.alternateLocale` ;
- produire une canonical localisée ;
- ajouter les alternates `languages` ;
- générer les variantes du sitemap ;
- définir correctement `<html lang>` ;
- vérifier que les pages privées et admin restent non indexées ;
- ajouter `x-default` si pertinent.

Les slugs peuvent rester identiques au premier jalon. Leur traduction éventuelle fera l'objet d'un chantier distinct avec redirections permanentes.

## 7. Architecture API cible

### 7.1 Préférence utilisateur

Ajouter à `User` :

```ts
@Column({ type: "varchar", length: 10, default: "fr" })
preferredLocale: SupportedLocale;
```

Ajouter le champ aux :

- DTO de création et mise à jour ;
- types web de l'utilisateur ;
- formulaire de préférences ;
- profil retourné par l'authentification ;
- seeds et fixtures ;
- migration TypeORM ;
- tests unitaires et e2e.

La modification de langue dans le web met à jour immédiatement l'URL et le cookie. Si l'utilisateur est authentifié, elle persiste également `preferredLocale` en API.

### 7.2 Réponse d'erreur stable

Contrat cible :

```json
{
  "statusCode": 404,
  "code": "PLAYER_NOT_FOUND",
  "params": {},
  "message": "Joueur non trouvé",
  "timestamp": "2026-08-07T12:00:00.000Z",
  "path": "/api/players/42"
}
```

Règles :

- `code` est stable, documenté et indépendant de la langue ;
- `params` contient uniquement les variables nécessaires à la présentation ;
- `message` reste présent pendant la transition ;
- le web cherche d'abord `Errors.<code>` puis utilise `message` comme compatibilité ;
- les informations sensibles ne sont jamais insérées dans `params` ;
- une erreur interne ne retourne jamais `exception.message` en production.

Créer une abstraction telle que :

```ts
throw new DomainException({
  status: HttpStatus.NOT_FOUND,
  code: "PLAYER_NOT_FOUND",
  params: {playerId: id}
});
```

Migrer les exceptions par domaine, sans big bang. Le filtre global doit comprendre les anciennes exceptions NestJS et les nouvelles erreurs métier.

### 7.3 Validation des DTO

Choix recommandé : exposer des codes de validation structurés plutôt que des phrases traduites :

```json
{
  "code": "VALIDATION_ERROR",
  "fields": {
    "email": [{"code": "INVALID_EMAIL"}],
    "password": [{"code": "MIN_LENGTH", "params": {"min": 12}}]
  }
}
```

Cela permet au web de traduire les messages et simplifie la réutilisation ultérieure par le mobile.

### 7.4 Localisation côté API

L'API localise uniquement les sorties qu'elle possède réellement :

- emails ;
- notifications push ;
- notifications serveur rendues ;
- contenus système demandés par locale ;
- éventuels exports ou documents générés côté serveur.

Les logs, noms de colonnes, enums et messages d'intégration internes ne sont pas localisés.

### 7.5 Emails

Organisation proposée :

```text
apps/api/src/mail/
├── locales/
│   ├── fr.json
│   └── en.json
└── templates/
    ├── layouts/
    ├── tournament-started.hbs
    ├── tournament-finished.hbs
    └── ...
```

Le template contient la structure HTML ; les textes sont fournis via le contexte traduit. Chaque envoi reçoit explicitement une locale.

À couvrir :

- sujet ;
- preheader ;
- titre ;
- corps ;
- libellé des liens ;
- formatage des dates et montants ;
- footer ;
- `lang` du document HTML.

Prévisualiser et tester chaque template dans les deux langues.

### 7.6 Notifications

Éviter de persister uniquement le texte final. Modèle cible recommandé :

```ts
type Notification = {
  type: string;
  translationKey: string;
  translationParams: Record<string, unknown>;
  localeSnapshot?: SupportedLocale;
  title?: string;
  body?: string;
};
```

Stratégie de transition :

1. conserver `title` et `body` pour les anciennes notifications ;
2. ajouter `translationKey`, `translationParams` et `localeSnapshot` ;
3. rendre les nouvelles notifications depuis la clé ;
4. produire le texte dans la locale du destinataire pour le push ou l'email ;
5. utiliser le texte historique si aucune clé n'existe.

Ne jamais placer de secret, email ou donnée sensible dans `translationParams`.

### 7.7 WebSockets et événements temps réel

Les événements Socket.IO doivent transporter des codes et données, pas des phrases rendues :

```json
{
  "event": "MATCH_READY",
  "params": {"matchId": 42}
}
```

Le client traduit l'événement. Les événements destinés à générer un email ou une notification différée doivent permettre à l'API de retrouver l'utilisateur et sa préférence de langue.

## 8. Modèle de données des contenus traduisibles

### 8.1 Classification

| Contenu | Propriétaire | Traduction automatique | Stockage recommandé |
|---|---|---:|---|
| Interface web | Produit | Non | Dictionnaires JSON |
| FAQ | Produit | Non | Table de traductions |
| Badges | Produit | Non | Table de traductions |
| Challenges | Produit | Non | Table de traductions |
| États de carte | Produit | Non | Dictionnaire ou table de traductions |
| Articles éditoriaux | Produit/source externe | Selon source | Variante par locale |
| Cartes Pokémon | TCGdex | Import officiel | Tables de traductions |
| Produits scellés | Produit/TCG | Non | Étendre `SealedProductLocale` |
| Tournois utilisateur | Utilisateur | Non | Texte original |
| Decks et collections | Utilisateur | Non | Texte original |
| Annonces marketplace | Utilisateur | Non | Texte original + langue déclarée |
| Tickets de support | Utilisateur/support | Non | Texte original |

### 8.2 Tables de traductions métier

Préférer des tables explicites aux colonnes `nameFr`, `nameEn`, afin de faciliter l'ajout de langues.

Exemple FAQ :

```text
faq
- id
- category_code
- order
- created_at
- updated_at

faq_translation
- id
- faq_id
- locale
- question
- answer
- unique(faq_id, locale)
```

Appliquer le même principe à :

- `badge_translation` ;
- `challenge_translation` ;
- `card_state_translation`, si le label doit rester administrable ;
- `tournament_reward_translation`, pour les récompenses système ;
- éventuellement `article_translation`.

Les valeurs de catégorie doivent devenir des codes techniques (`tournaments`, `account`) et non des libellés français stockés comme enums.

### 8.3 Produits scellés

Étendre `SealedProductLocale` au-delà du nom si nécessaire :

- `name` ;
- `description` ;
- contenu éditorial éventuel ;
- métadonnées SEO éventuelles.

Les endpoints doivent accepter la locale depuis `Accept-Language` et retourner :

- une vue résolue pratique pour le web ;
- éventuellement toutes les traductions sur les endpoints d'administration.

### 8.4 Catalogue Pokémon

Ne pas dupliquer l'entité canonique `Card`, car les decks, collections, listings et statistiques doivent continuer à référencer la même carte.

Modèle indicatif :

```text
card
- id interne canonique
- tcg_dex_id
- données non linguistiques

card_translation
- id
- card_id
- locale
- name
- category_label éventuel
- description
- effect
- evolve_from
- item
- abilities
- attacks
- boosters
- source_updated_at
- unique(card_id, locale)
```

Les champs véritablement non linguistiques restent sur `Card` ou `PokemonCardDetails` :

- points de vie ;
- types normalisés ;
- coûts énergétiques normalisés ;
- dégâts ;
- rareté sous forme de code ;
- légalité ;
- prix ;
- images ;
- illustrateur ;
- marque de régulation.

### 8.5 Synchronisation TCGdex

Adapter le job pour :

1. synchroniser les données canoniques une seule fois ;
2. parcourir les locales activées pour le catalogue ;
3. récupérer les variantes localisées ;
4. faire un upsert par `(card_id, locale)` ;
5. conserver la dernière traduction connue en cas d'échec temporaire ;
6. produire un rapport de couverture par langue ;
7. limiter la concurrence et mettre en cache les appels ;
8. tolérer l'absence d'une carte dans une langue ;
9. préserver tous les caractères Unicode ;
10. tester la correspondance des identifiants entre langues avant migration globale.

Le premier incrément du catalogue peut se limiter à `fr` et `en`. Les autres langues TCGdex ne doivent pas être activées avant d'avoir mesuré leur complétude et validé le modèle.

### 8.6 Recherche et tri

La recherche doit considérer la locale active :

- rechercher d'abord dans la traduction demandée ;
- inclure le fallback français si nécessaire ;
- conserver la recherche par identifiant, SKU et numéro local ;
- définir explicitement les règles d'accentuation et de casse ;
- éviter les tris JavaScript non déterministes pour les grandes listes ;
- ajouter les index nécessaires sur `(locale, name)` ou une stratégie de recherche PostgreSQL adaptée.

Mesurer les performances avant et après migration.

## 9. Plan de mise en œuvre

### Phase 0 — Cadrage et décisions

**Estimation : 1 à 2 jours**

### Travaux

- Valider `fr` et `en` comme langues initiales.
- Valider le préfixe obligatoire, y compris pour `fr`.
- Valider la politique de fallback.
- Définir qui produit et valide les traductions.
- Décider si le catalogue anglais fait partie du premier lancement public.
- Décider si les notifications existantes restent figées en français.
- Inventorier les pages publiques indexables.
- Créer une ADR décrivant les décisions i18n.

### Livrables

- ADR approuvée.
- Liste des locales et fallbacks.
- Matrice des contenus à traduire.
- Glossaire FR/EN initial.

### Critères d'acceptation

- Toutes les décisions bloquantes sont documentées.
- Le périmètre du premier lancement est figé.
- Un responsable linguistique est identifié.

### Phase 1 — Socle i18n web

**Estimation : 3 à 5 jours**

### Travaux

- Installer et configurer `next-intl`.
- Créer `i18n/config.ts`, `routing.ts`, `navigation.ts` et `request.ts`.
- Créer les dictionnaires `fr.json` et `en.json`.
- Déplacer les routes sous `app/[locale]`.
- Fusionner détection de locale et proxy d'authentification.
- Ajouter le cookie de locale.
- Ajouter le sélecteur de langue.
- Localiser les redirections d'authentification.
- Ajouter `Accept-Language` aux clients Axios.
- Rendre `<html lang>` dynamique.
- Ajouter des tests de routage et de fallback.

### Critères d'acceptation

- `/` redirige vers `/fr` ou `/en` selon la politique.
- `/fr` et `/en` rendent la même page dans deux langues.
- Une route protégée conserve sa locale lors de la redirection de connexion.
- Le changement de langue conserve le pathname et les query params.
- Une locale inconnue ne provoque pas de boucle de redirection.
- Les appels API contiennent la locale active.

### Phase 2 — Composants partagés et navigation

**Estimation : 4 à 6 jours**

### Travaux

- Traduire le header, sidebar, footer et breadcrumbs.
- Migrer tous les liens vers les wrappers localisés.
- Traduire les composants d'état vide, chargement et erreur.
- Centraliser les labels communs, rôles, statuts et actions.
- Centraliser le formatage date/nombre/devise.
- Migrer les toasts et dialogues de confirmation.
- Adapter les composants UI qui exposent des `aria-label`.

### Critères d'acceptation

- Aucun composant de navigation partagé n'utilise directement `next/link`.
- Les routes ne perdent pas la locale lors d'une navigation.
- Les lecteurs d'écran reçoivent des libellés dans la bonne langue.
- Les dates et nombres suivent la locale active.
- La devise préférée ne change pas lors du changement de langue.

### Phase 3 — Traduction fonctionnelle du web

**Estimation : 6 à 10 jours**

Migrer domaine par domaine :

1. authentification et pages d'erreur ;
2. accueil et dashboard ;
3. profil et paramètres ;
4. catalogue Pokémon ;
5. collection ;
6. decks ;
7. marketplace, panier et commandes ;
8. tournois et classement ;
9. modes de jeu ;
10. support et administration.

Pour chaque domaine :

- extraire les textes visibles ;
- extraire les labels d'enums ;
- traiter les pluriels ;
- traiter les textes interpolés ;
- traduire les toasts et erreurs locales ;
- remplacer les formats en dur ;
- tester les états loading, empty, error et success ;
- vérifier les écrans mobiles du web et les débordements.

### Critères d'acceptation

- Aucun texte français non justifié ne reste dans une page anglaise.
- Aucun identifiant technique brut n'est affiché à la place d'un label.
- Les paramètres de message sont échappés correctement.
- Les principaux parcours métier sont utilisables dans les deux langues.

### Phase 4 — Préférence utilisateur et erreurs API

**Estimation : 4 à 6 jours**

### Travaux

- Ajouter la migration `preferredLocale`.
- Mettre à jour entité, DTO, services et types web.
- Persister la sélection de langue pour l'utilisateur connecté.
- Introduire `DomainException` et le nouveau payload d'erreur.
- Créer un catalogue de codes d'erreur.
- Adapter le filtre global.
- Structurer les erreurs de validation.
- Migrer en priorité auth, marketplace, commandes, tournois et collections.
- Adapter `extractApiErrorMessage` pour utiliser les codes traduits.
- Documenter les codes dans Swagger.

### Critères d'acceptation

- Les nouveaux endpoints retournent un code stable.
- Le web affiche une traduction locale à partir du code.
- Les anciens messages continuent de fonctionner pendant la transition.
- Les erreurs internes ne divulguent pas leur message technique en production.
- La préférence utilisateur est restaurée sur un autre navigateur après connexion.

### Phase 5 — Emails, notifications et temps réel

**Estimation : 3 à 5 jours**

### Travaux

- Extraire les textes des templates Handlebars.
- Créer les dictionnaires serveur FR/EN.
- Passer explicitement la locale à chaque envoi.
- Centraliser le formatage serveur des dates et montants.
- Ajouter les colonnes de traduction des notifications.
- Migrer les listeners vers clé + paramètres.
- Adapter les événements Socket.IO contenant des textes.
- Ajouter des snapshots ou rendus de test des emails.

### Critères d'acceptation

- Chaque email existe et est testé en français et en anglais.
- Un événement asynchrone utilise la langue enregistrée du destinataire.
- Une notification historique sans clé reste lisible.
- Aucun montant n'est formaté systématiquement en `fr-FR`.

### Phase 6 — Contenus système en base

**Estimation : 4 à 7 jours**

### Travaux

- Créer les tables de traductions nécessaires.
- Transformer les catégories françaises stockées en base en codes stables.
- Migrer les données françaises existantes comme traductions `fr`.
- Ajouter les traductions anglaises.
- Adapter les seeds.
- Adapter les endpoints publics pour résoudre une locale.
- Adapter les endpoints admin pour gérer toutes les variantes.
- Ajouter les fallbacks.
- Adapter recherche, filtres et tris.

### Critères d'acceptation

- Une migration non destructive conserve tous les contenus français.
- Les endpoints retournent la bonne variante selon `Accept-Language`.
- L'administration distingue clairement contenu canonique et traductions.
- Une traduction manquante utilise le fallback documenté.

### Phase 7 — Catalogue Pokémon multilingue

**Estimation : 8 à 12 jours**

### Travaux

- Valider les identifiants TCGdex entre `fr` et `en` sur un échantillon représentatif.
- Séparer les champs linguistiques et non linguistiques.
- Créer les entités et migrations de traduction.
- Adapter le synchroniseur à plusieurs locales.
- Supprimer la normalisation ASCII des textes affichés.
- Migrer les données françaises existantes.
- Importer les variantes anglaises.
- Adapter les endpoints carte, set et série.
- Adapter la recherche et les index.
- Produire des métriques de couverture et de fallback.
- Tester les decks, collections, listings et effets parsés après migration.

### Critères d'acceptation

- Une carte canonique reste référencée par les mêmes relations métier.
- Les données localisées ne créent pas de doublons de collection ou de listing.
- Les caractères Unicode sont conservés.
- Une traduction absente n'empêche pas l'affichage de la carte.
- Le job est idempotent et peut reprendre après un échec.
- La couverture `fr`/`en` est mesurée et publiée.

### Phase 8 — SEO international

**Estimation : 2 à 4 jours**

### Travaux

- Localiser les métadonnées des pages publiques.
- Ajouter canonical et alternates.
- Générer les entrées de sitemap FR/EN.
- Vérifier Open Graph et Twitter Cards.
- Vérifier les redirections des anciennes URL.
- Vérifier robots et pages privées.
- Tester les statuts HTTP et éviter les soft 404.

### Critères d'acceptation

- Chaque page publique possède une canonical cohérente.
- Les pages FR et EN se référencent mutuellement avec `hreflang`.
- Les anciennes URL ont une redirection unique et permanente ou temporaire selon la politique de lancement.
- Le sitemap ne contient ni pages privées ni URL invalides.

### Phase 9 — QA, observabilité et lancement

**Estimation : 3 à 5 jours**

### Travaux

- Exécuter la matrice de tests FR/EN.
- Effectuer une revue linguistique.
- Tester les parcours anonymes et authentifiés.
- Tester les emails, notifications et WebSockets.
- Tester les fallbacks de contenu.
- Tester fuseaux horaires, nombres et devises.
- Mesurer les performances des endpoints traduits.
- Ajouter des métriques de traductions manquantes.
- Déployer derrière un feature flag si possible.
- Préparer un plan de rollback.

### Critères d'acceptation

- Aucun blocage critique sur les parcours prioritaires.
- Aucun lien ne sort involontairement de la locale active.
- Les erreurs de traduction sont observables.
- Les migrations sont validées sur une copie de la production.
- Le rollback est documenté et testé.

## 10. Stratégie de tests

### 10.1 Tests unitaires web

- résolution et validation des locales ;
- helpers de navigation ;
- formatage date, nombre et devise ;
- pluriels ICU ;
- mapping code d'erreur vers traduction ;
- labels des enums ;
- sélection du fallback.

### 10.2 Tests d'intégration web

- rendu d'une page Server Component en `fr` et `en` ;
- changement de langue sans perte de query params ;
- navigation client localisée ;
- hydratation sans divergence de formatage ;
- chargement du seul dictionnaire nécessaire ;
- pages `not-found` et `error` localisées.

### 10.3 Tests e2e web

Matrice minimale :

| Parcours | FR | EN | Anonyme | Authentifié |
|---|:---:|:---:|:---:|:---:|
| Accueil et navigation | ✓ | ✓ | ✓ | ✓ |
| Connexion/inscription | ✓ | ✓ | ✓ | — |
| Profil/préférences | ✓ | ✓ | — | ✓ |
| Recherche de carte | ✓ | ✓ | ✓ | ✓ |
| Collection | ✓ | ✓ | — | ✓ |
| Création de deck | ✓ | ✓ | — | ✓ |
| Marketplace/panier | ✓ | ✓ | ✓ | ✓ |
| Checkout/commande | ✓ | ✓ | — | ✓ |
| Tournoi | ✓ | ✓ | ✓ | ✓ |
| Support | ✓ | ✓ | — | ✓ |

### 10.4 Tests API

- négociation `Accept-Language` ;
- rejet ou fallback d'une locale invalide ;
- persistance de `preferredLocale` ;
- structure des erreurs métier ;
- structure des erreurs de validation ;
- résolution des contenus traduits ;
- fallback français ;
- rendu email dans les deux langues ;
- notification asynchrone dans la préférence utilisateur ;
- synchronisation TCGdex idempotente ;
- absence de doublons métier entre traductions.

### 10.5 Tests visuels et linguistiques

Vérifier au minimum :

- desktop et mobile web ;
- textes anglais plus longs ;
- boutons, onglets et badges ;
- tableaux et colonnes ;
- dialogues ;
- emails ;
- caractères accentués et Unicode ;
- textes en majuscules ;
- coupure de mots et troncature ;
- accessibilité des sélecteurs de langue.

## 11. CI et qualité

Ajouter à la CI :

- validation JSON des dictionnaires ;
- parité des clés entre `fr` et `en` ;
- détection des clés inutilisées si l'outil choisi le permet ;
- détection de clés dynamiques non vérifiables ;
- tests des formatters ;
- recherche de nouvelles occurrences de `fr-FR` hors exceptions autorisées ;
- recherche de textes visibles ajoutés directement dans les composants ;
- build Next.js pour chaque locale ;
- tests de migrations TypeORM ;
- vérification des liens localisés.

La détection automatique des textes en dur doit commencer comme avertissement, puis devenir bloquante une fois la migration terminée.

## 12. Observabilité

Mesures recommandées :

- nombre de requêtes web par locale ;
- changements de langue ;
- taux de fallback par domaine de contenu ;
- clés de traduction manquantes ;
- erreurs API sans code métier ;
- emails envoyés par locale ;
- couverture des traductions TCGdex ;
- durée et erreurs du job de synchronisation par locale ;
- latence des recherches localisées ;
- erreurs de redirection ou boucles détectées.

Ne pas utiliser la locale comme dimension non bornée : seules les locales validées doivent apparaître dans les métriques.

## 13. Sécurité et confidentialité

- Valider strictement les locales pour éviter les lectures de fichiers arbitraires.
- Ne jamais construire un chemin de dictionnaire depuis une valeur utilisateur non validée.
- Échapper les paramètres interpolés dans les emails et contenus riches.
- Ne pas exposer les messages bruts des exceptions internes.
- Ne pas stocker de données sensibles dans les paramètres de notification.
- Conserver les protections CSRF, cookies et CORS lors de la modification du proxy.
- Tester les redirections pour éviter les open redirects via le paramètre `redirect`.
- Ne pas envoyer de contenu traduit non validé dans les templates HTML.

## 14. Migration et compatibilité

### 14.1 Compatibilité des URL

- Pendant la transition, rediriger les URL sans locale.
- Conserver pathname, query params et hash lorsque possible.
- Ne pas casser les liens inclus dans les emails ou notifications historiques.
- Décider si les anciennes URL reçoivent une redirection 307 pendant la phase pilote puis 308 après stabilisation.

### 14.2 Compatibilité API

- Ajouter `code` et `params` sans retirer immédiatement `message`.
- Rendre `Accept-Language` optionnel avec fallback français.
- Ne pas changer les valeurs des enums existantes uniquement pour les traduire.
- Versionner les changements de payload qui ne peuvent pas rester additifs.

### 14.3 Migration des données

- Créer les tables de traduction avant de modifier les lectures.
- Copier les valeurs existantes dans la locale `fr`.
- Vérifier les comptes et checksums avant suppression éventuelle de colonnes.
- Activer la lecture depuis les nouvelles tables derrière un flag.
- Reporter la suppression des anciennes colonnes à une migration ultérieure.
- Sauvegarder la base et tester le rollback.

## 15. Stratégie de déploiement

### Étape A — Shadow mode

- Déployer schémas, préférences et codes d'erreur additifs.
- Continuer à servir uniquement le français.
- Collecter les métriques de locale et de fallback.

### Étape B — Pilote anglais

- Activer `/en` derrière un feature flag ou pour un groupe interne.
- Laisser `/fr` comme expérience par défaut.
- Tester les contenus incomplets et la charge du catalogue.

### Étape C — Lancement public

- Activer le sélecteur de langue.
- Publier les sitemaps et alternates.
- Surveiller erreurs, fallbacks et conversion des parcours importants.

### Étape D — Nettoyage

- Retirer les chemins de compatibilité inutiles.
- Rendre bloquants les contrôles CI de textes en dur.
- Supprimer les anciennes colonnes seulement après une période de stabilité.

## 16. Plan de rollback

En cas de problème :

1. désactiver le sélecteur et la locale anglaise ;
2. rediriger temporairement toutes les URL vers `/fr` ;
3. conserver les nouvelles colonnes et tables, sans rollback destructif ;
4. rétablir la lecture des anciens champs via feature flag ;
5. maintenir `message` dans les erreurs API ;
6. suspendre uniquement les jobs TCGdex multilingues défaillants ;
7. conserver les données importées pour diagnostic.

Le rollback applicatif ne doit pas nécessiter de supprimer immédiatement les données de traduction.

## 17. Gouvernance des traductions

### 17.1 Rôles

- Développeur : crée les clés, variables et contexte.
- Référent produit : valide le sens fonctionnel.
- Traducteur ou relecteur : produit et valide la version anglaise.
- QA : vérifie l'affichage et les parcours.

### 17.2 Règles éditoriales

- Maintenir un glossaire partagé : deck, booster, set, listing, bracket, etc.
- Définir le niveau de formalité et le ton.
- Définir les termes qui restent en anglais en français.
- Documenter les noms de marque non traduisibles.
- Utiliser les pluriels ICU plutôt que des formulations approximatives.
- Fournir du contexte pour les termes ambigus.

### 17.3 Cycle d'une nouvelle fonctionnalité

Une fonctionnalité n'est terminée que si :

- toutes ses clés existent en français et en anglais ;
- ses erreurs API possèdent des codes ;
- ses dates et nombres utilisent les formatters communs ;
- ses liens conservent la locale ;
- ses emails ou notifications sont localisés ;
- ses tests couvrent les deux locales ;
- sa documentation précise les nouveaux contenus traduisibles.

## 18. Risques et mesures de réduction

| Risque | Probabilité | Impact | Mesure |
|---|:---:|:---:|---|
| Régression du proxy d'authentification | Moyenne | Élevé | Tests e2e sur routes protégées et redirections |
| Lien interne perdant la locale | Élevée | Moyen | Wrappers de navigation et contrôle CI |
| Catalogue anglais incomplet | Élevée | Moyen | Fallback FR et métrique de couverture |
| Mauvaise correspondance TCGdex entre langues | Moyenne | Élevé | Validation sur échantillon avant migration |
| Doublons de cartes ou relations cassées | Faible à moyenne | Critique | Entité canonique unique et migrations testées |
| Recherche plus lente | Moyenne | Moyen | Index, benchmark et analyse des requêtes |
| Emails partiellement traduits | Moyenne | Moyen | Templates partagés et snapshots FR/EN |
| Messages serveur historiques en français | Élevée | Faible | Compatibilité `title/body` et migration progressive |
| Traductions trop longues pour l'UI | Élevée | Moyen | QA visuelle et composants flexibles |
| Divergence des clés FR/EN | Moyenne | Moyen | Validation automatique en CI |
| Fuite d'erreur technique | Existante | Élevé | Nouveau filtre et masquage en production |
| Suppression des accents par l'import | Existante | Élevé | Suppression de la normalisation ASCII affichée |

## 19. Dépendances et prérequis

- Validation produit des langues initiales.
- Disponibilité des traductions anglaises.
- Accès à une copie représentative de la base.
- Capacité à exécuter et restaurer les migrations TypeORM.
- Mesure de complétude TCGdex FR/EN.
- Environnement de préproduction proche de la production.
- Outil ou procédure de prévisualisation des emails.
- Temps QA sur desktop et mobile web.

## 20. Backlog synthétique

### Priorité P0 — nécessaire au pilote

- ADR i18n.
- Configuration `next-intl`.
- Routes `[locale]`.
- Proxy locale + auth.
- Navigation localisée.
- Sélecteur et cookie de langue.
- `preferredLocale` utilisateur.
- Dictionnaires communs FR/EN.
- Pages auth, erreurs, navigation et accueil.
- Formatters communs.
- Codes d'erreur sur auth et parcours prioritaires.
- Tests e2e des redirections.

### Priorité P1 — nécessaire au lancement web

- Traduction de tous les domaines fonctionnels.
- Emails et notifications critiques.
- SEO international.
- FAQ et contenus système principaux.
- Contrôles CI.
- Observabilité et feature flags.
- Revue linguistique.

### Priorité P2 — catalogue et enrichissement

- Tables de traduction catalogue.
- Synchronisation TCGdex anglaise.
- Recherche localisée.
- Administration des traductions.
- Métriques de couverture.
- Nettoyage des anciens champs.

### Priorité P3 — extensions futures

- Troisième langue.
- Slugs localisés.
- Intégration mobile.
- Outil de traduction collaboratif.
- Traduction assistée avec validation humaine.
- Variantes régionales comme `en-GB` ou `fr-CA`.

## 21. Definition of Done globale

Le chantier FR/EN est considéré terminé lorsque :

- toutes les pages web ciblées fonctionnent sous `/fr` et `/en` ;
- le changement de langue est persistant et accessible ;
- les redirections d'authentification conservent la locale ;
- les textes d'interface ciblés sont extraits des composants ;
- les dates, nombres et devises utilisent une locale explicite ;
- les erreurs prioritaires possèdent un code stable ;
- les emails et notifications critiques utilisent la langue du destinataire ;
- les contenus système ciblés possèdent un fallback contrôlé ;
- le catalogue ne duplique aucune carte métier ;
- canonical, `hreflang` et sitemap sont corrects ;
- les contrôles de parité des dictionnaires passent en CI ;
- la matrice de tests FR/EN est validée ;
- les métriques et le rollback sont opérationnels ;
- la documentation développeur est à jour.

## 22. Ordre recommandé des pull requests

Pour garder des changements relisibles :

1. ADR et constantes de locale partagées ;
2. installation `next-intl` et route minimale `[locale]` ;
3. composition du proxy avec l'authentification ;
4. wrappers de navigation et layout partagé ;
5. préférence utilisateur et migration API ;
6. formatters et composants communs ;
7. migration auth, erreurs et paramètres ;
8. migration domaine par domaine du web ;
9. codes d'erreur API par domaine ;
10. emails et notifications ;
11. contenus système en base ;
12. catalogue TCGdex et recherche ;
13. SEO, sitemap et observabilité ;
14. durcissement CI et nettoyage.

Chaque PR doit rester déployable et conserver le fallback français.

## 23. Documentation de référence

- [Guide d'internationalisation Next.js](https://nextjs.org/docs/app/guides/internationalization)
- [Documentation next-intl](https://next-intl.dev/)
- [nestjs-i18n](https://github.com/toonvanstrijp/nestjs-i18n)
- [TCGdex multilingue](https://tcgdex.dev/)
- [État des traductions TCGdex](https://tcgdex.dev/status)
- [Codes de langue TCGdex](https://tcgdex.dev/errors/language-invalid)
