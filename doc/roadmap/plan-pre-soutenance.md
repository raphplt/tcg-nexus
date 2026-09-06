# Plan de stabilisation pré-soutenance — TCG Nexus

> Version : 1.0  
> Horizon : 3 semaines / 15 jours ouvrés  
> Cible : soutenance finale et démonstration sur l'environnement déployé  
> Hypothèse de capacité : une personne principale, avec parallélisation possible si plusieurs contributeurs sont disponibles  
> Principe directeur : geler le périmètre fonctionnel et terminer les parcours existants avant d'ajouter de nouvelles fonctions

## 1. Objectif

Ce plan transforme l'audit technique et produit du projet en feuille de route exécutable. Il vise à rendre TCG Nexus :

- sûr pour ses utilisateurs et administrateurs ;
- fiable pendant une démonstration de 10 à 15 minutes ;
- visuellement fini, même lorsque les données sont absentes ou qu'un service échoue ;
- déployable et observable sans dépendre d'un diagnostic manuel ;
- crédible comme produit viable au-delà du POC ;
- documenté de façon cohérente pour le jury ;
- compatible avec une authentification locale et des fournisseurs OAuth tiers.

Le résultat attendu n'est pas d'exposer toutes les fonctions du monorepo. Le résultat attendu est de démontrer trois parcours verticaux complets, soutenus par une sécurité, une CI et un environnement de démo fiables.

## 2. Résumé de l'état initial

### 2.1 Points solides à préserver

- Le build global, le lint et les vérifications TypeScript passent.
- La suite complète exécute 1 517 tests : 1 516 réussissent et 1 est ignoré.
- L'API possède 1 297 tests et des E2E PostgreSQL sur les tournois.
- Le web dispose de 138 tests et d'une identité visuelle cohérente.
- L'interface publique est responsive et la production est accessible.
- L'API applique déjà validation globale, Helmet, CORS, throttling, cookies HttpOnly et contrôle d'origine CSRF.
- Les migrations, Docker, Coolify, Cloudflare Tunnel et la documentation d'exploitation existent déjà.

### 2.2 Risques majeurs identifiés

1. `PATCH /users/me` accepte des champs administratifs et permet une élévation de privilèges potentielle.
2. La production contient des articles dont les liens deviennent `/blog/null`.
3. La production paraît vide ou datée : aucun tournoi public, articles de 2024 et mentions légales absentes.
4. Le healthcheck API valide seulement une réponse `Hello World!`, sans vérifier PostgreSQL, les migrations ou Vision.
5. Le compose de production utilise PostgreSQL standard alors que la recherche visuelle dépend de pgvector.
6. La CI frontend ne lance pas les tests web et le build mobile est un simple `echo`.
7. Il n'existe aucun E2E navigateur protégeant les parcours montrés au jury.
8. Le web possède 64 pages, aucun `loading.tsx` et un seul `error.tsx`.
9. L'accueil public hydrate beaucoup de logique cliente et vérifie inutilement l'authentification d'un visiteur anonyme.
10. Le mobile possède peu de tests, des dépendances Expo désalignées et un écran de réinitialisation de mot de passe sans endpoint API correspondant.
11. Le contrat d'authentification renvoie les tokens dans le JSON même pour le web, ce qui réduit la protection offerte par les cookies HttpOnly.
12. Le README et plusieurs liens de documentation ne correspondent plus au dépôt réel.

## 3. Résultat cible pour la soutenance

La version soutenue doit respecter les critères suivants :

- aucun utilisateur standard ne peut modifier son rôle ou un attribut réservé à l'administration ;
- les parcours de connexion locale et OAuth aboutissent à la même identité TCG Nexus ;
- aucun token web n'est lisible depuis JavaScript ;
- les trois parcours de démonstration sont couverts par des smoke tests automatisés ;
- l'environnement de démo peut être préparé par une commande idempotente et non destructive ;
- toutes les cartes et tous les liens montrés pendant la démo sont valides ;
- un échec de l'API produit un état d'erreur propre avec une action de reprise ;
- le healthcheck de disponibilité échoue si PostgreSQL ou une migration indispensable manque ;
- un build mobile réel peut être installé sur le téléphone de démonstration si le mobile reste dans le périmètre ;
- la documentation racine permet à un tiers de comprendre, installer, tester et déployer le projet ;
- le code est gelé au moins 48 heures avant la soutenance.

## 4. Parcours verticaux à démontrer

### Parcours A — Scanner et collectionner

1. Connexion sur mobile.
2. Ouverture du scanner.
3. Scan d'une carte préparée et connue du dataset.
4. Affichage des candidats et du niveau de confiance.
5. Confirmation de la carte.
6. Ajout à une collection.
7. Vérification de la synchronisation sur le web.

Critères d'acceptation :

- le scan de référence réussit trois fois de suite dans les conditions de la salle ;
- un mode de repli permet de sélectionner manuellement le bon candidat ;
- l'absence de Vision affiche une explication et n'empêche pas le parcours texte ;
- la carte apparaît dans la collection sans rechargement complet ;
- une vidéo de secours du parcours est disponible hors ligne.

### Parcours B — Tournoi de bout en bout

1. Connexion avec un compte organisateur.
2. Présentation d'un tournoi déjà peuplé.
3. Affichage des inscrits et du seeding.
4. Ouverture du bracket ou des rondes suisses.
5. Saisie d'un résultat.
6. Propagation vers le tour suivant et mise à jour du classement.
7. Affichage de l'historique du joueur.

Critères d'acceptation :

- le tournoi de démo est toujours dans un état connu avant la présentation ;
- le résultat ne peut être saisi que par un rôle autorisé ;
- la propagation est visible immédiatement ;
- un reset ciblé permet de rejouer la même étape sans tronquer toute la base ;
- le parcours est couvert par un E2E API et un smoke test navigateur.

### Parcours C — Deck et jeu

1. Import ou création d'un deck.
2. Ajout et retrait de cartes.
3. Validation du format.
4. Analyse du deck.
5. Démarrage d'une partie d'entraînement contre l'IA.
6. Présentation d'une action de jeu et de sa résolution.

Critères d'acceptation :

- le deck de référence est toujours disponible ;
- l'analyse retourne un résultat lisible même si le fournisseur IA est indisponible ;
- le moteur démarre avec les cartes du preset ;
- aucune page ne reste vide pendant le chargement ;
- les erreurs du moteur sont capturées sans casser toute l'application.

## 5. Ordre de priorité

| ID | Chantier | Priorité | Impact | Effort cible | Semaine |
|---|---|---:|---:|---:|---:|
| SEC-01 | Bloquer l'élévation de privilèges | P0 | Critique | 0,5–1 j | 1 |
| DATA-01 | Réparer les slugs et migrations de production | P0 | Très fort | 1 j | 1 |
| OPS-01 | Healthchecks réels et cohérence pgvector | P0 | Très fort | 1–1,5 j | 1 |
| QA-01 | E2E navigateur des parcours critiques | P0 | Très fort | 2 j | 1 |
| DEMO-01 | Dataset et reset de démonstration | P0 | Très fort | 1,5–2 j | 1–2 |
| AUTH-01 | Séparer les sessions web et mobile | P1 | Fort | 1–1,5 j | 2 |
| AUTH-02 | Ajouter OAuth Google | P1 | Fort | 2–3 j | 2 |
| AUTH-03 | Préparer Apple et Discord | P1/P2 | Moyen/fort | 1–3 j | 2–3 |
| UX-01 | Loading, erreurs et états vides | P1 | Fort | 2 j | 2 |
| PERF-01 | Alléger l'accueil et l'auth anonyme | P1 | Moyen/fort | 1,5–2 j | 2 |
| MOB-01 | Stabiliser Expo et produire un vrai build | P1 | Fort si présenté | 2–3 j | 3 |
| OPS-02 | Logs, erreurs et sauvegardes | P1 | Fort | 1–2 j | 3 |
| DOC-01 | README, docs et pages légales | P1 | Moyen/fort | 1–1,5 j | 3 |
| MAINT-01 | Réduire les hotspots de complexité | P2 | Moyen | Hors chemin critique | Après soutenance |

## 6. Chantier SEC-01 — Corriger l'élévation de privilèges

### Problème

La route de mise à jour du profil personnel consomme `UpdateUserDto`. Ce DTO contient `role`, `isPro`, `isActive` et `emailVerified`, alors que ces attributs ne doivent être modifiés que par l'administration.

### Tâches

- [ ] Créer `UpdateMyProfileDto` avec uniquement :
  - `firstName` ;
  - `lastName` ;
  - `avatarUrl` ;
  - `preferredCurrency` ;
  - `preferredLocale` ;
  - éventuellement `email`, uniquement avec une procédure de reverification.
- [ ] Renommer le DTO actuel en `AdminUpdateUserDto` ou créer un DTO administratif explicite.
- [ ] Utiliser `UpdateMyProfileDto` sur `PATCH /users/me`.
- [ ] Utiliser `AdminUpdateUserDto` sur `PATCH /users/:id`.
- [ ] Ne jamais transmettre le DTO directement à `Repository.update` sans sélection explicite des champs.
- [ ] Ajouter un service distinct `updateOwnProfile` pour rendre la règle visible dans le domaine.
- [ ] Vérifier les autres endpoints `me`, `self`, `profile` et les DTO dérivés avec `PartialType`.
- [ ] Ajouter un test unitaire du service.
- [ ] Ajouter un test E2E envoyant chaque champ interdit.

### Critères d'acceptation

- une requête utilisateur contenant `role`, `isPro`, `isActive` ou `emailVerified` reçoit un `400` grâce à `forbidNonWhitelisted` ;
- le rôle de l'utilisateur reste inchangé en base ;
- l'administrateur peut toujours modifier ces champs via la route dédiée ;
- les contrats Swagger distinguent clairement mise à jour personnelle et administrative ;
- les tests de non-régression s'exécutent dans la CI.

## 7. Chantiers DATA-01 et DEMO-01 — Production et données de démonstration

### 7.1 Réparer les articles

- [ ] Vérifier `migration:show` sur l'environnement déployé.
- [ ] Confirmer que la migration `ArticlePublishing` a été appliquée.
- [ ] Écrire une migration corrective idempotente qui :
  - backfill tous les slugs absents ;
  - déduplique les collisions ;
  - rend `slug` non nul ;
  - conserve une redirection pour les anciennes URLs numériques si nécessaire.
- [ ] Ajouter un contrôle au démarrage qui signale le nombre d'articles sans slug.
- [ ] Refuser côté API la publication d'un article sans slug valide.
- [ ] Rendre le composant web défensif : aucune génération de lien avec `null` ou `undefined`.
- [ ] Ajouter un test E2E vérifiant tous les liens des cartes d'article.

### 7.2 Actualiser le contenu public

- [ ] Créer au moins trois articles récents liés au projet ou à son fonctionnement.
- [ ] Préparer un tournoi à venir et un tournoi en cours.
- [ ] Ajouter des annonces de marketplace crédibles avec plusieurs états de cartes.
- [ ] Préparer un classement, des decks et des profils cohérents.
- [ ] Vérifier les deux locales françaises et anglaises pour chaque contenu montré.
- [ ] Supprimer ou masquer les contenus de démonstration devenus trompeurs.

### 7.3 Seed de démonstration sûr

Créer une commande distincte, par exemple `npm run demo:prepare`, qui ne réutilise pas le seed destructif de production.

Le seed doit :

- être idempotent ;
- utiliser des identifiants fonctionnels stables ;
- mettre à jour uniquement les données marquées `demo` ;
- ne jamais tronquer une table ;
- être interdit sur l'environnement de production principal sauf activation explicite ;
- produire un rapport avec les comptes, tournois, decks et cartes préparés ;
- proposer un `demo:reset-tournament` ciblé pour rejouer la démo ;
- ne pas contenir de mot de passe administrateur connu sur un environnement public.

### Critères d'acceptation

- aucun lien public ne contient `null` ou `undefined` ;
- l'accueil ne paraît pas vide ;
- la commande peut être lancée deux fois sans duplication ;
- le scénario tournoi peut être remis à son état initial en moins de 30 secondes ;
- le script refuse de s'exécuter si les garde-fous d'environnement ne sont pas satisfaits.

## 8. Chantiers AUTH-01 à AUTH-03 — Authentification locale et OAuth

### 8.1 Décision d'architecture

Conserver TCG Nexus comme autorité de session. Google, Apple et Discord prouvent l'identité initiale, mais les permissions, rôles, collections et sessions restent gérés par l'API NestJS.

Ordre recommandé :

1. Google sur web et mobile.
2. Sign in with Apple si une distribution iOS publique est prévue.
3. Discord en option communautaire après stabilisation de Google.

Google offre la meilleure valeur immédiate pour une soutenance. Discord correspond bien à la communauté TCG, mais ne doit pas retarder le socle sécurisé. Si l'app iOS propose Google ou Discord comme connexion principale, les règles de revue Apple imposent généralement une option équivalente respectueuse de la confidentialité ; Sign in with Apple doit donc être planifié avant une soumission App Store.

### 8.2 Séparer les contrats web et mobile

#### Web

- Les access et refresh tokens sont uniquement écrits dans des cookies `HttpOnly`, `Secure` et `SameSite=Lax`.
- Les réponses JSON de login, register et refresh web ne contiennent aucun token.
- Le frontend reçoit uniquement l'utilisateur et l'expiration utile à l'interface.
- Le navigateur ne stocke jamais un token dans `localStorage`, `sessionStorage` ou un store JavaScript.

#### Mobile

- Les endpoints mobiles retournent les tokens TCG Nexus dans le JSON.
- Les tokens sont conservés dans `expo-secure-store` sur iOS et Android.
- Le refresh token reste rotatif.
- Les access tokens sont envoyés dans `Authorization: Bearer`.
- Le support web d'Expo ne doit pas stocker le refresh token dans `localStorage` en production ; il doit utiliser le flux cookie du web ou être explicitement hors périmètre.

#### Migration sans rupture

- [ ] Introduire des endpoints ou adaptateurs explicites, par exemple :
  - `POST /auth/web/login` ;
  - `POST /auth/web/refresh` ;
  - `POST /auth/mobile/login` ;
  - `POST /auth/mobile/refresh`.
- [ ] Conserver temporairement les routes historiques pendant la migration des clients.
- [ ] Déprécier les anciennes routes dans Swagger et la documentation.
- [ ] Supprimer le partage de `JWT_SECRET` avec Next.js à terme ; le proxy peut interroger une route de session interne ou vérifier un token signé par une clé publique distincte.

### 8.3 Modèle de données OAuth

Ajouter une entité séparée plutôt que de placer les identifiants fournisseurs dans `User`.

Proposition : `AuthIdentity`

| Champ | Type | Contrainte |
|---|---|---|
| `id` | UUID ou entier | clé primaire |
| `userId` | FK | cascade à la suppression du compte |
| `provider` | enum | `google`, `apple`, `discord` |
| `providerSubject` | string | identifiant stable `sub` du fournisseur |
| `providerEmail` | string nullable | information de diagnostic, pas identité primaire |
| `providerEmailVerified` | boolean | issu du claim vérifié |
| `createdAt` | timestamp | audit |
| `updatedAt` | timestamp | audit |

Contraintes :

- unicité sur `(provider, providerSubject)` ;
- un utilisateur peut lier plusieurs fournisseurs ;
- l'email du fournisseur ne doit jamais remplacer `providerSubject` comme clé d'identité ;
- les tokens OAuth du fournisseur ne sont pas stockés si aucune API fournisseur n'est consommée ;
- si un token fournisseur doit être stocké plus tard, il doit être chiffré, avoir une durée limitée et être révocable.

Le mot de passe de `User` doit devenir nullable pour les comptes OAuth-only. La stratégie locale doit refuser proprement un compte sans mot de passe et proposer la connexion avec le fournisseur lié.

### 8.4 Règles de création et de liaison de compte

#### Nouveau sujet fournisseur

1. Valider la réponse du fournisseur.
2. Chercher `(provider, providerSubject)`.
3. Si aucune identité n'existe et aucun compte local ne correspond, créer un utilisateur `USER`.
4. Créer les collections par défaut dans la même transaction.
5. Créer `AuthIdentity`.
6. Émettre une session TCG Nexus.

#### Email déjà utilisé par un compte local

Ne pas auto-lier silencieusement sur la seule base de l'email.

- Si l'utilisateur est déjà connecté, permettre une liaison explicite depuis les paramètres.
- Sinon, demander une authentification locale ou une validation par email avant la liaison.
- N'accepter une proposition de liaison que si le fournisseur marque l'email comme vérifié.
- Journaliser les tentatives et avertir le propriétaire du compte.

#### Compte déjà lié

- Retrouver l'utilisateur par `providerSubject`.
- Ne jamais modifier automatiquement son rôle, son abonnement ou son état actif depuis les claims.
- Refuser la connexion si le compte TCG Nexus est désactivé.

#### Déliaison

- Permettre de délier un fournisseur uniquement si une autre méthode de connexion reste disponible.
- Demander une réauthentification récente.
- Révoquer le token fournisseur si un token a été conservé.
- Ajouter une notification de sécurité à l'utilisateur.

### 8.5 Flux OAuth web

Utiliser Authorization Code avec PKCE S256, `state` et `nonce`.

1. Le web ouvre `GET /auth/oauth/:provider/start?returnTo=/fr/dashboard`.
2. L'API valide `provider` et limite `returnTo` à une route locale autorisée.
3. L'API génère :
   - un `state` aléatoire ;
   - un `nonce` aléatoire pour OIDC ;
   - un `code_verifier` PKCE ;
   - le `code_challenge` S256 correspondant.
4. L'API conserve la transaction pendant cinq minutes maximum dans une table dédiée ou un cookie chiffré, HttpOnly et SameSite=Lax.
5. L'utilisateur est redirigé vers le fournisseur.
6. Le fournisseur rappelle `GET /auth/oauth/:provider/callback` avec `code` et `state`.
7. L'API vérifie le `state`, échange le code côté serveur et valide :
   - signature ;
   - issuer ;
   - audience/client ID ;
   - expiration ;
   - nonce ;
   - PKCE ;
   - email vérifié lorsque nécessaire.
8. L'API résout ou crée `AuthIdentity` et `User` dans une transaction.
9. L'API émet les cookies TCG Nexus.
10. L'utilisateur est redirigé vers `returnTo`.

Interdictions :

- aucun token fournisseur dans l'URL finale ;
- aucun client secret dans Next.js ou dans un bundle navigateur ;
- aucune redirection vers une URL arbitraire ;
- aucun implicit flow ;
- aucune confiance accordée à un profil envoyé directement par le client.

### 8.6 Flux OAuth mobile

Utiliser Authorization Code avec PKCE et un redirect URI explicitement enregistré.

1. L'app utilise le SDK recommandé du fournisseur lorsqu'il existe, sinon `expo-auth-session`.
2. L'app génère une transaction PKCE S256 et un `state` unique.
3. Le navigateur système s'ouvre sur le fournisseur.
4. Le fournisseur redirige vers un App Link/Universal Link ou, pour la preview interne, vers `tcgnexus://auth/callback`.
5. L'app transmet uniquement le code, le code verifier, le redirect URI et le provider à l'API.
6. L'API échange le code et valide les claims.
7. L'API retourne une session mobile TCG Nexus, pas les tokens fournisseur.
8. L'app enregistre les tokens TCG Nexus dans SecureStore.

Avant une distribution publique, préférer Universal Links/App Links au schéma personnalisé afin de réduire le risque qu'une autre application intercepte le callback.

### 8.7 Endpoints proposés

| Méthode | Route | Client | Fonction |
|---|---|---|---|
| GET | `/auth/oauth/providers` | tous | fournisseurs activés et métadonnées UI |
| GET | `/auth/oauth/:provider/start` | web | démarre le flux et redirige |
| GET | `/auth/oauth/:provider/callback` | web | valide le callback et crée les cookies |
| POST | `/auth/oauth/:provider/mobile/exchange` | mobile | échange le code PKCE contre une session TCG Nexus |
| POST | `/auth/oauth/:provider/link` | authentifié | lie un fournisseur au compte courant |
| DELETE | `/auth/oauth/:provider/link` | authentifié | délie un fournisseur après réauthentification |
| GET | `/auth/identities` | authentifié | liste les méthodes de connexion liées |

### 8.8 Variables d'environnement

- `OAUTH_GOOGLE_CLIENT_ID_WEB`
- `OAUTH_GOOGLE_CLIENT_SECRET_WEB`
- `OAUTH_GOOGLE_CLIENT_ID_IOS`
- `OAUTH_GOOGLE_CLIENT_ID_ANDROID`
- `OAUTH_APPLE_CLIENT_ID`
- `OAUTH_APPLE_TEAM_ID`
- `OAUTH_APPLE_KEY_ID`
- `OAUTH_APPLE_PRIVATE_KEY`
- `OAUTH_DISCORD_CLIENT_ID`
- `OAUTH_DISCORD_CLIENT_SECRET`
- `OAUTH_CALLBACK_BASE_URL=https://tcg-nexus.org/api/auth/oauth`
- `OAUTH_ALLOWED_RETURN_PATHS=/,/dashboard,/collection,/decks,/play`

Les secrets ne doivent apparaître ni dans une variable `NEXT_PUBLIC_*`, ni dans Expo `extra`, ni dans un log de CI.

### 8.9 Interface utilisateur

- [ ] Ajouter « Continuer avec Google » sur connexion et inscription.
- [ ] Ajouter Apple sur iOS si requis par la distribution.
- [ ] Ajouter Discord uniquement lorsque son flux est validé sur web et mobile.
- [ ] Conserver email/mot de passe pendant la migration.
- [ ] Afficher une séparation visuelle « ou » accessible.
- [ ] Ajouter les états chargement, annulation, refus de consentement et compte désactivé.
- [ ] Ajouter dans les paramètres la liste des méthodes liées et l'action de liaison/déliaison.
- [ ] Traduire tous les libellés et erreurs en français et anglais.
- [ ] Ne pas afficher « email déjà utilisé » d'une façon facilitant l'énumération de comptes.

### 8.10 Tests OAuth

#### Unitaires

- génération et expiration de `state` ;
- validation du `nonce` ;
- validation issuer/audience/expiration ;
- génération PKCE S256 ;
- allowlist de `returnTo` ;
- résolution d'identité par `providerSubject` ;
- refus d'auto-link d'un email existant ;
- impossibilité d'obtenir un rôle autre que `USER` à la création.

#### Intégration

- callback valide avec fournisseur simulé ;
- code déjà consommé ;
- state invalide ou expiré ;
- email non vérifié ;
- compte désactivé ;
- transaction de création rollbackée si les collections échouent ;
- liaison et déliaison avec réauthentification.

#### E2E

- web : démarrage, callback simulé, cookies présents, aucun token dans le DOM ou le JSON ;
- mobile : échange du code, stockage SecureStore simulé et restauration de session ;
- redirection finale locale uniquement ;
- coexistence login local/OAuth ;
- migration d'un compte local vers un compte lié.

### 8.11 Définition de terminé OAuth Google

- connexion et création fonctionnent sur web, Android preview et iOS preview ;
- aucune clé secrète n'est présente dans les bundles ;
- le web ne reçoit aucun refresh token en JSON ;
- le mobile ne reçoit aucun token Google durable ;
- les tests de sécurité state, nonce, PKCE, audience et redirection passent ;
- le même compte peut être retrouvé après déconnexion/reconnexion ;
- un compte local existant ne peut pas être pris par correspondance d'email ;
- les mentions de confidentialité décrivent les données Google collectées.

## 9. Chantier QA-01 — Tests et CI

### 9.1 E2E navigateur

Ajouter Playwright avec une base PostgreSQL éphémère et des fixtures dédiées.

Smoke tests minimaux :

- [ ] accueil public, absence de lien invalide et contenu principal visible ;
- [ ] inscription locale, connexion, profil et déconnexion ;
- [ ] utilisateur standard incapable d'accéder à l'administration ;
- [ ] marketplace vers fiche carte ;
- [ ] création/import d'un deck ;
- [ ] tournoi : ouverture du bracket et saisie autorisée d'un résultat ;
- [ ] OAuth callback simulé ;
- [ ] rendu mobile du web aux largeurs 390 et 768 pixels.

### 9.2 CI

- [ ] Ajouter `npm --prefix apps/web test` au job frontend.
- [ ] Ajouter un job E2E web après le build API/web.
- [ ] Ajouter un vrai `check-types` à l'API.
- [ ] Ajouter `check-types`, `lint`, `test` et `build` aux workspaces qui en manquent.
- [ ] Remplacer le build mobile fictif par `expo export` ou une validation EAS adaptée.
- [ ] Corriger les sorties Turbo pour Docusaurus et mobile.
- [ ] Ajouter `npm audit --omit=dev` en rapport non bloquant, puis bloquant uniquement sur les vulnérabilités critiques réellement exploitables.
- [ ] Corriger le handle Jest qui ne se ferme pas proprement.
- [ ] Conserver les artefacts de rapport et captures E2E au moins 14 jours.

### Critères d'acceptation

- une PR ne peut pas être fusionnée si les tests web ou E2E critiques échouent ;
- le build global ne peut plus réussir avec un faux build mobile ;
- la CI produit une capture et une trace pour chaque échec E2E ;
- aucune suite de tests ne force la terminaison d'un worker à cause d'un handle ouvert.

## 10. Chantier OPS-01 — Déploiement et healthchecks

### 10.1 PostgreSQL et pgvector

- [ ] Remplacer `postgres:15-alpine` par l'image pgvector compatible utilisée en développement.
- [ ] Vérifier `CREATE EXTENSION vector`, `pg_trgm` et `unaccent` au déploiement.
- [ ] Ajouter un test d'intégration confirmant une requête vectorielle simple.
- [ ] Rendre visible dans le healthcheck si la recherche visuelle est dégradée.
- [ ] Valider les migrations avant de rendre l'API prête.

### 10.2 Endpoints de santé

Créer :

- `GET /api/health/live` : processus Nest vivant ;
- `GET /api/health/ready` : base accessible et migrations indispensables présentes ;
- `GET /api/health/details` : réservé aux administrateurs ou au réseau interne.

Le readiness doit vérifier :

- `SELECT 1` sur PostgreSQL ;
- présence des extensions nécessaires ;
- présence des colonnes/migrations critiques ;
- disponibilité du service Vision ;
- configuration du stockage R2 si la fonctionnalité est activée.

Les dépendances optionnelles doivent produire `degraded`, pas nécessairement `down`. Le healthcheck Docker doit cibler `/health/ready`, jamais le `Hello World!` racine.

### 10.3 Déploiement

- [ ] Exécuter `migration:show` avant le déploiement.
- [ ] Effectuer une sauvegarde avant toute migration destructive.
- [ ] Déployer API et migrations avant le web qui dépend du nouveau contrat.
- [ ] Ajouter un smoke test post-déploiement.
- [ ] Documenter le rollback applicatif et la compatibilité des migrations.
- [ ] Vérifier que le déploiement refuse une variable critique absente.

## 11. Chantier OPS-02 — Observabilité et sauvegardes

### Logs et erreurs

- [ ] Ajouter un `requestId` propagé du proxy Next.js vers l'API et Vision.
- [ ] Produire des logs JSON en production.
- [ ] Masquer cookies, JWT, secrets OAuth, adresses complètes et données Stripe.
- [ ] Centraliser les erreurs frontend/backend avec contexte de version.
- [ ] Ajouter des événements métier pour login échoué, refresh replay, paiement et résultat de tournoi.
- [ ] Définir une alerte sur taux de 5xx, latence API et échec de healthcheck.

### Sauvegardes

- [ ] Automatiser `pg_dump` quotidien.
- [ ] Chiffrer et stocker les sauvegardes hors de la VM principale.
- [ ] Définir une rétention, par exemple 7 quotidiennes et 4 hebdomadaires.
- [ ] Tester une restauration sur une base isolée avant la soutenance.
- [ ] Documenter RPO, RTO et procédure de restauration.

### Critères d'acceptation

- une erreur montrée dans le navigateur peut être retrouvée par `requestId` ;
- aucun secret n'apparaît dans les logs ;
- une restauration complète a été testée et chronométrée ;
- les erreurs de production sont consultables sans accès SSH direct à la VM.

## 12. Chantier UX-01 — Finition visuelle et résilience

### Socle commun

- [ ] Ajouter un `loading.tsx` au layout principal, aux pages catalogue, marketplace, tournoi et deck.
- [ ] Ajouter des `error.tsx` par grande zone fonctionnelle.
- [ ] Créer des composants réutilisables :
  - `PageSkeleton` ;
  - `EmptyState` ;
  - `ErrorState` ;
  - `RetryButton` ;
  - `OfflineBanner`.
- [ ] Uniformiser les toasts de succès et d'échec.
- [ ] Ne jamais afficher une erreur Axios brute à l'utilisateur.

### Accueil

- [ ] Afficher un skeleton à la place de « Chargement… ».
- [ ] Donner un état digne à « aucun tournoi à venir ».
- [ ] Réduire légèrement la hauteur du hero desktop pour montrer une preuve produit au-dessus de la ligne de flottaison.
- [ ] Garantir une carte de repli si la carte aléatoire échoue.
- [ ] Masquer une section si son contenu n'apporte aucune valeur plutôt que montrer un bloc vide.

### Accessibilité

- [ ] Auditer avec axe les pages accueil, login, marketplace, tournoi et deck.
- [ ] Ajouter des noms accessibles à tous les boutons icône.
- [ ] Vérifier focus clavier, contrastes, labels de formulaire et messages d'erreur.
- [ ] Respecter `prefers-reduced-motion`.
- [ ] Remplacer les `<img>` éditoriaux pertinents par une solution optimisée avec texte alternatif utile.

### Critères d'acceptation

- chaque page critique possède chargement, vide, erreur et succès ;
- tous les parcours sont utilisables au clavier sur web ;
- aucune erreur réseau ne laisse une page blanche ;
- les breakpoints 390, 768, 1 280 et 1 536 pixels sont vérifiés.

## 13. Chantier PERF-01 — Performance web

### Mesure initiale à conserver

- HTML initial de l'accueil observé autour de 180 Ko.
- TTFB ponctuel observé autour de 690 ms en production.
- Réponse d'accueil non cachée.
- Plusieurs requêtes d'authentification anonymes peuvent conduire à du bruit et à des `429` lors de navigations répétées.

### Tâches

- [ ] Déplacer les contenus publics de l'accueil vers des Server Components avec ISR.
- [ ] Conserver en client uniquement le hero personnalisé et les interactions.
- [ ] Mettre en cache articles, produits scellés, tendances et tournois publics.
- [ ] Définir des clés et durées d'invalidation par domaine.
- [ ] Éviter `profile -> 401 -> refresh -> 401` pour un visiteur sans cookie.
- [ ] Utiliser la présence du cookie ou l'état du proxy pour initialiser `AuthProvider`.
- [ ] Dédupliquer les requêtes React Query et harmoniser leurs `staleTime`.
- [ ] Mesurer Web Vitals avant/après sur desktop et mobile.
- [ ] Ajouter un budget : LCP < 2,5 s sur réseau moyen, CLS < 0,1 et aucune requête d'auth pour un anonyme sans cookie.

### Critères d'acceptation

- les sections publiques utiles apparaissent dans le HTML initial ;
- un utilisateur anonyme ne déclenche pas de refresh token ;
- l'accueil peut être servi depuis un cache contrôlé ;
- aucune régression fonctionnelle n'est introduite dans la personnalisation utilisateur.

## 14. Chantier MOB-01 — Stabilisation mobile

### Décision de périmètre

Le mobile doit être soit démontré comme parcours stable, soit présenté explicitement comme compagnon alpha. Il ne doit pas rester dans un état intermédiaire non assumé.

### Si le mobile est présenté

- [ ] Aligner les dépendances avec la version Expo choisie.
- [ ] Corriger la régression Hermes signalée par `expo-doctor` via une montée de version validée.
- [ ] Faire passer `expo-doctor` sans erreur.
- [ ] Produire un build EAS preview Android et iOS.
- [ ] Installer le build sur le téléphone de soutenance 48 heures avant la démo.
- [ ] Tester caméra, permissions, deep links OAuth et notifications.
- [ ] Ajouter des tests sur AuthProvider, token refresh, scanner et ajout à la collection.
- [ ] Implémenter réellement le mot de passe oublié ou retirer temporairement le lien.
- [ ] Vérifier que le mode web Expo n'enregistre aucun refresh token dans `localStorage` en production.

### Si le mobile n'est pas présenté

- [ ] Le décrire comme alpha dans la documentation.
- [ ] Ne pas promettre les fonctions incomplètes.
- [ ] Conserver uniquement une vidéo enregistrée du scanner.
- [ ] Concentrer le temps restant sur le web et l'API.

### Critères d'acceptation

- un artefact installable existe ;
- le scanner de référence fonctionne sans serveur de développement ;
- la session est restaurée après redémarrage ;
- les deep links OAuth reviennent dans la bonne application ;
- aucune clé privée ou client secret n'est embarqué dans l'app.

## 15. Chantier sécurité complémentaire

### Auth locale

- [ ] Appliquer côté API une politique de mot de passe cohérente avec les clients.
- [ ] Ajouter longueur maximale et normalisation de l'email.
- [ ] Ajouter vérification d'email.
- [ ] Implémenter un vrai flux de mot de passe oublié avec token court, à usage unique et stocké haché.
- [ ] Révoquer toutes les sessions après changement de mot de passe.
- [ ] Ajouter notification lors d'une liaison OAuth ou d'une modification de sécurité.

### Cookies et headers

- [ ] Configurer `COOKIE_SAMESITE=lax` pour le domaine unique actuel.
- [ ] Ajouter une CSP au frontend Next.js.
- [ ] Ajouter HSTS, `frame-ancestors`, `Referrer-Policy` et `Permissions-Policy` au web.
- [ ] Vérifier les headers sur le domaine final via un test automatisé.

### Dépendances

- [ ] Trier les 49 alertes de `npm audit --omit=dev` par exposition réelle.
- [ ] Corriger en priorité les dépendances directes hautes : Swagger/js-yaml et Puppeteer/extract-zip.
- [ ] Séparer les dépendances de build/docs des dépendances runtime dans l'analyse.
- [ ] Éviter toute montée majeure générale pendant la dernière semaine.
- [ ] Ajouter une revue de licence et de provenance des images/données utilisées.

## 16. Chantier DOC-01 — Documentation et conformité

### README

- [ ] Remplacer MySQL par PostgreSQL + pgvector.
- [ ] Corriger `apps/doc` en `apps/docs`.
- [ ] Pointer vers `doc/TESTING.md`, `doc/architecture.md` et `doc/mise-a-jour-prod.md`.
- [ ] Mettre à jour le nombre de tests.
- [ ] Supprimer ou réparer les chemins inexistants.
- [ ] Documenter une installation validée depuis un clone propre.
- [ ] Expliquer clairement web, API, mobile, Vision, Fetch et Docs.

### Documentation technique

- [ ] Publier ou rediriger correctement le portail Docusaurus.
- [ ] Ajouter un diagramme d'architecture lisible sur une diapositive.
- [ ] Documenter les flux local, cookie, mobile token et OAuth.
- [ ] Documenter le modèle `AuthIdentity` et les règles de liaison.
- [ ] Documenter healthchecks, migrations, sauvegarde et rollback.
- [ ] Mettre à jour l'ADR JWT ou créer un ADR dédié OAuth.

### Légal et confidentialité

- [ ] Mentions légales.
- [ ] Politique de confidentialité.
- [ ] CGU.
- [ ] CGV, livraison, retours et remboursement si la marketplace est présentée comme réelle.
- [ ] Suppression de compte et export des données.
- [ ] Données reçues de Google, Apple et Discord.
- [ ] Finalité, durée de conservation et procédure de déliaison OAuth.

## 17. Chantier MAINT-01 — Dette structurelle après stabilisation

Ne pas lancer une refonte générale avant la soutenance. Extraire seulement les zones qui empêchent les tests, la compréhension ou la correction d'un bug.

Hotspots identifiés :

- `GameEngine.ts` : environ 3 440 lignes ;
- page web `/play` : environ 2 079 lignes ;
- `tournament.service.ts` : environ 1 439 lignes ;
- plusieurs écrans mobile : 1 200 à 1 500 lignes ;
- services marketplace et deck : plus de 1 000 lignes.

Après la soutenance :

- découper par cas d'usage ;
- extraire les machines d'état et règles pures ;
- réduire les dépendances croisées ;
- supprimer les `any` explicites restants ;
- remplacer les `console.*` de production par le logger structuré ;
- compléter les TSDoc des APIs exportées ;
- convertir les commentaires de code non anglais conformément aux règles du dépôt.

## 18. Planning précis sur trois semaines

### Semaine 1 — Sécurité, production et filet de sécurité

#### Jour 1

- matin : SEC-01, séparation des DTO personnels/admin ;
- après-midi : tests unitaires et E2E d'élévation de privilèges ;
- fin de journée : recherche des autres mass assignments.

Livrable : faille fermée et testée.

#### Jour 2

- audit `migration:show` ;
- migration corrective des articles ;
- contrôle des slugs et liens ;
- mise à jour du contenu public minimal.

Livrable : aucune URL `null` ou `undefined`.

#### Jour 3

- image PostgreSQL pgvector en production ;
- endpoints `live` et `ready` ;
- healthcheck Docker ;
- smoke test post-déploiement.

Livrable : l'environnement ne peut pas être déclaré prêt si la base est cassée.

#### Jours 4 et 5

- installation Playwright ;
- base et fixtures E2E ;
- smoke tests accueil, auth, droits, marketplace et tournoi ;
- intégration CI ;
- correction du handle Jest ouvert.

Livrable : les parcours critiques bloquent une régression avant merge.

### Semaine 2 — Auth moderne, démo et performance

#### Jour 6

- séparation des contrats web/mobile ;
- suppression des tokens JSON du flux web ;
- configuration SameSite et headers web ;
- tests de compatibilité.

#### Jours 7 et 8

- entité et migration `AuthIdentity` ;
- Google Authorization Code + PKCE côté API ;
- callback web ;
- création/résolution sécurisée des comptes ;
- tests state, nonce, PKCE et liaison.

#### Jour 9

- bouton Google web ;
- flux mobile Google avec deep link ;
- vérification des secrets et bundles ;
- documentation des redirect URIs.

#### Jour 10

- seed de démonstration idempotent ;
- reset ciblé du tournoi ;
- données récentes ;
- première répétition chronométrée.

Livrable de semaine : Google fonctionne au minimum sur web et sur le téléphone de preview, et la démo est reproductible.

### Semaine 3 — Finition, mobile, exploitation et gel

#### Jours 11 et 12

- loading/error/empty states ;
- accueil server-rendered/ISR ;
- suppression de l'auth check anonyme inutile ;
- contrôle responsive et axe.

#### Jour 13

- alignement Expo ;
- vrai build EAS preview ;
- test scanner, SecureStore, deep links et notifications ;
- décision finale sur Apple/Discord.

#### Jour 14

- logs/requestId ;
- sauvegarde et test de restauration ;
- README, Docusaurus, ADR OAuth et pages légales ;
- audit final des dépendances.

#### Jour 15

- répétition complète sur le réseau et le matériel réels ;
- préparation de la vidéo de secours ;
- correction uniquement des bloqueurs ;
- tag/release candidate ;
- gel du code.

## 19. Variante si le délai n'est que de deux semaines

Conserver uniquement :

1. SEC-01 ;
2. DATA-01 ;
3. OPS-01 ;
4. QA-01 ;
5. DEMO-01 ;
6. séparation web/mobile de l'auth ;
7. Google OAuth web ;
8. loading/error states des trois parcours ;
9. README et documentation de soutenance.

Reporter :

- Discord ;
- Apple si aucune soumission App Store immédiate n'est prévue ;
- refactorings des gros fichiers ;
- observabilité avancée ;
- fonctions marketplace non nécessaires à la démo ;
- OAuth mobile si le mobile n'est pas indispensable au récit de soutenance.

## 20. Répartition possible à plusieurs contributeurs

### Flux A — API et sécurité

- SEC-01 ;
- contrats auth web/mobile ;
- `AuthIdentity` ;
- OAuth callbacks ;
- healthchecks ;
- migrations.

### Flux B — Web et QA

- Playwright ;
- interface OAuth ;
- loading/error states ;
- performance accueil ;
- accessibilité.

### Flux C — Mobile et exploitation

- Expo/EAS ;
- OAuth mobile/deep links ;
- scanner de démonstration ;
- Coolify, sauvegardes et docs.

Règle : aucun flux ne modifie seul le contrat d'auth partagé. Les changements d'API doivent être accompagnés du contrat, des tests et de la migration des deux clients dans la même PR ou dans des PRs ordonnées et rétrocompatibles.

## 21. Stratégie de branches et de livraison

- une branche courte par identifiant de chantier, préfixée `codex/` ou selon la convention de l'équipe ;
- une PR par changement vérifiable ;
- aucune PR « refactor + feature + migration » trop large ;
- migrations additives et rétrocompatibles avant la bascule des clients ;
- suppression des anciennes routes seulement après validation des deux clients ;
- release candidate taguée à J-3 ;
- correctifs autorisés après gel uniquement pour sécurité critique ou blocage de démo.

## 22. Checklist de release candidate

### Sécurité

- [ ] élévation de privilèges impossible ;
- [ ] tokens web absents des réponses JSON ;
- [ ] secrets OAuth absents des bundles et logs ;
- [ ] state, nonce et PKCE testés ;
- [ ] redirections OAuth allowlistées ;
- [ ] mot de passe oublié soit fonctionnel, soit masqué ;
- [ ] vulnérabilités critiques : zéro.

### Démo

- [ ] trois parcours répétés trois fois ;
- [ ] comptes et données disponibles ;
- [ ] reset tournoi testé ;
- [ ] carte physique de référence disponible ;
- [ ] téléphone chargé et build installé ;
- [ ] vidéo de secours locale ;
- [ ] aucune dépendance à Expo Go ou au serveur de développement.

### Technique

- [ ] lint ;
- [ ] type-check complet ;
- [ ] tests unitaires ;
- [ ] E2E API ;
- [ ] E2E navigateur ;
- [ ] build API, web, docs et mobile réel ;
- [ ] readiness vert ;
- [ ] migrations appliquées ;
- [ ] restauration de sauvegarde testée.

### Produit

- [ ] aucun lien cassé ;
- [ ] aucun `null`/`undefined` visible ;
- [ ] contenus récents ;
- [ ] états vides et erreurs propres ;
- [ ] FR et EN vérifiés ;
- [ ] responsive et navigation clavier vérifiés ;
- [ ] pages légales accessibles.

### Documentation

- [ ] README à jour ;
- [ ] architecture à jour ;
- [ ] ADR OAuth ;
- [ ] procédure de déploiement ;
- [ ] procédure de rollback ;
- [ ] procédure de restauration ;
- [ ] identifiants de démo remis séparément au présentateur, jamais versionnés.

## 23. Indicateurs de succès

| Indicateur | Cible avant soutenance |
|---|---:|
| Tests complets | 100 % verts hors skips documentés |
| E2E critiques | 100 % verts sur trois exécutions consécutives |
| Vulnérabilités critiques runtime | 0 |
| Liens `null`/`undefined` | 0 |
| Temps de reset démo | < 30 s |
| LCP accueil mobile | < 2,5 s sur profil réseau moyen |
| Requêtes auth d'un anonyme sans cookie | 0 |
| Healthcheck readiness | base + migrations + dépendances critiques vérifiées |
| Temps de restauration documenté | mesuré et inférieur au RTO défini |
| Délai de gel | au moins 48 h avant soutenance |

## 24. Risques et plans de repli

| Risque | Réduction | Repli |
|---|---|---|
| OAuth fournisseur indisponible | conserver login local et tester le callback simulé | compte local de démo |
| Réseau de la salle instable | données et assets déjà présents, vidéo locale | démonstration enregistrée |
| Caméra/éclairage défavorable | carte connue, cadrage testé, fallback candidat | capture préenregistrée |
| Migration échouée | sauvegarde, migration testée sur clone | rollback applicatif documenté |
| Mobile non installable | build EAS à J-3 | démonstration web + vidéo scanner |
| Trop de travail OAuth | Google seulement | Discord/Apple après soutenance |
| Régression de dernière minute | gel J-2/J-3 | tag release candidate stable |

## 25. Sources techniques OAuth

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/reference)
- [Google OAuth 2.0 pour applications serveur](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Authentification dans Expo et React Native](https://docs.expo.dev/develop/authentication/)
- [Discord OAuth2](https://docs.discord.com/developers/platform/oauth2-and-permissions)
- [Apple App Review Guidelines — section 4.8](https://developer.apple.com/app-store/review/guidelines/)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/usage-guidelines-for-websites-and-other-platforms/)
- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

## 26. Décision finale recommandée

Pour maximiser l'impact dans le délai disponible :

1. fermer la faille de rôle immédiatement ;
2. rendre les données et la démo reproductibles ;
3. protéger les parcours par E2E ;
4. séparer le contrat cookie web du contrat token mobile ;
5. livrer Google OAuth proprement ;
6. ajouter Apple uniquement si la distribution iOS le rend nécessaire ;
7. garder Discord comme amélioration communautaire si le chemin critique est terminé ;
8. consacrer la dernière semaine à la finition, au matériel de démonstration et au gel, pas à de nouvelles fonctions.

Cette séquence donne un produit plus sûr, plus convaincant et plus défendable techniquement, tout en conservant la richesse fonctionnelle déjà acquise.
