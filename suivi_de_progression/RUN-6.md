# Fiche de progression – RUN 6 (2026-04-16)

## 1. Contexte

- Numéro et date du RUN : 6 – 2026-04-16
- Durée prévue : ~4 semaines
- Équipe active : `@raphplt`, `@soldrix`, `@Jounayd`, `@aymardl`, `@peron_h`
- Objectifs globaux du RUN :
  - **Finaliser les chantiers non bouclés du RUN 5** (mobile, jeu en ligne, items scellés, notifications, carry-over deck/analyse/follow/profil public).
  - **Livrer l'application mobile Expo** (auth, tournois, collection, scan OCR).
  - **Clôturer le jeu en ligne (TCG)** : matchs casuels stabilisés, enchaînement tournoi → match en ligne.
  - **Compléter les items scellés** (amélioration listing, intégration marketplace, stocks).
  - **Mettre en place le système de notifications in-app + push** (tournois, matchs, communauté).
  - **Lancer les chantiers Communauté** (follow, profil public, actualités) et **Analytics organisateurs** (#121).
  - **Renforcer la qualité** : tests unitaires NestJS (#50), middleware de logs API (#52), schéma BDD (#55).

## 2. Bilan du RUN précédent (RUN 5)

- Objectifs visés lors du RUN 5 :
  - Terminer le carry-over du RUN 4 (formulaire deck, mes tournois, analyse deck front, badges, historique ELO).
  - Développer la Gamification (badges, défis, classement ELO).
  - Implémenter le Dashboard utilisateur.
  - Renforcer l'IA (recommandations, alternatives, comparateur).
  - Poser les bases de la Communauté (profil public, follow).
  - Ajouter le Support (notifications, tickets, reset password).
  - Améliorer les Tournois (matchs, actualités).

- Objectifs **atteints** :
  - Dashboard utilisateur avec stats personnelles (#114) ✅
  - Historique des tournois d'un joueur / ELO simple (#107 / #145 mergé) ✅
  - Défis quotidiens / hebdomadaires (#147 / PR #162 mergé) ✅
  - Système de tickets support / aide (#119) ✅
  - Page de gestion des decks connecté (#100) ✅
  - Logique métier tournois (#87) + endpoint Join Tournament (#78) ✅
  - Pipeline CI/CD (#130) ✅

- Objectifs **partiellement atteints** (carry-over vers RUN 6) :
  - **Ajout des items scellés** (#161 / PR #163 mergé mais #165 améliorations encore en cours) ❗
  - **Jeu en ligne TCG** (#153 / PR #160 mergé : matchs training + casual en place, mais stabilisation, fluidité, intégration tournoi à finir) ❗
  - Formulaire de création/édition de deck avec sélection de cartes (#101) ❗
  - Remplacement des données mockées "Mes tournois" (#105) ❗
  - Interface d'analyse de deck côté front (#104) ❗
  - Système de badges / succès – achievements (#112) ❗
  - Export de deck au format PDF / Image (#109 à fusionner) ❗
  - Copier un deck existant (#148 à fusionner) ❗
  - Système de notifications tournois push/email (#106) ❗
  - Système de recommandations de cartes pour collection (#108) ❗
  - Classement global des joueurs ELO (#113) ❗

- Objectifs **non atteints** :
  - Suivre un autre utilisateur (#149) – non démarré.
  - Profil public utilisateur (#150) – non démarré.
  - Authentification – login / register / mot de passe oublié (#156) – non démarré.
  - Page actualités / annonces de tournois – non démarrée (module `article` présent côté API mais pas d'UI dédiée).
  - Tests unitaires / E2E : toujours reportés (dette technique).

- **Éléments non prévus ajoutés pendant le RUN 5** :
  - **Items scellés (Sealed Products)** – nouvelle verticale marketplace : entité, import, service, page de listing, page détail, section "sealed" sur la home. Reste à finaliser dans le ticket #165.
  - **TCG en ligne (jouer au TCG)** – architecture combat, matchs casuels / training IA, gateway Socket.io, overlays (coin flip, prompts), deck import/export JSON, VisualMatchBoardView. Reste à fiabiliser et à brancher sur les tournois.
  - **Application mobile Expo** – démarrée à mi-RUN (issues #155, #157, #158, #159) avec les écrans de base (marketplace, collection, profil) et les services API mobile.

## 3. Issues carry-over du RUN 5

| Issue | Titre | Priorité | Statut actuel | Assigné |
| ----- | ----- | -------- | ------------- | ------- |
| #101 | Formulaire de création/édition de deck avec sélection de cartes | P0 | En cours | @raphplt |
| #105 | Remplacer les données mockées "Mes tournois" par des données réelles | P0 | En cours | @Jounayd |
| #104 | Interface d'analyse de deck côté front | P1 | À faire | @raphplt |
| #108 | Système de recommandations de cartes pour collection | P1 | À faire | @raphplt |
| #112 | Système de badges / succès (achievements) | P1 | En cours | @soldrix |
| #113 | Classement global des joueurs (ELO / points) | P1 | À faire | @Jounayd |
| #106 | Système de notifications tournois (push / email) | P2 | En cours | @peron_h |
| #148 | Copier un deck existant | P1 | À fusionner | @aymardl |
| #109 | Export de deck au format PDF / Image | P2 | À fusionner | @aymardl |
| #149 | Suivre un autre utilisateur | P1 | À faire | @soldrix |
| #150 | Profil public utilisateur | P1 | À faire | @soldrix |
| #156 | Authentification – login, register, mot de passe oublié (mobile) | P1 | À faire | @Jounayd |
| #165 | Améliorations items scellés | P1 | En cours | @raphplt |

## 4. Issues existantes à intégrer au sprint

| Issue | Titre | Priorité | Labels | Assigné |
| ----- | ----- | -------- | ------ | ------- |
| #155 | Architecture de base et services API mobile | P0 | Feature, Mobile | @raphplt |
| #157 | Scan OCR de cartes Pokémon pour import de collection | P1 | Feature, Mobile | @aymardl |
| #158 | Consultation et gestion des tournois (mobile) | P1 | Feature, Mobile | @Jounayd |
| #159 | Consultation de la collection et intégration avec le scan (mobile) | P1 | Feature, Mobile | @aymardl |
| #121 | Rapports / analytics pour les organisateurs de tournois | P2 | Feature, Support | @soldrix |
| #55 | Créer le schéma de base de données | P0 | Feature | @raphplt |
| #50 | Ajouter des tests unitaires pour les services NestJS | P2 | Feature | @Jounayd |
| #52 | Ajouter un middleware de log des requêtes API | P2 | Feature | @peron_h |

## 5. Nouveaux tickets à créer

Les tickets suivants sont issus de la story map (versions 2 & 3) et des chantiers non couverts par le backlog existant. Ils seront créés dans GitHub Projects avec les labels correspondants.

---

### Finaliser le jeu TCG en ligne (stabilisation + intégration tournoi) `P0` `Tournois` `Match`

- [ ] Stabiliser la gateway Socket.io (reconnexion, timeouts, gestion déconnexion propre)
- [ ] Terminer la logique de résolution des effets (cards effects registry, stadiums, conditionnels)
- [ ] Corriger les bugs d'évolution (discard / revert) identifiés en fin de RUN 5
- [ ] Mode `ranked` : matchs en ligne générant du score ELO
- [ ] Intégrer le match en ligne aux tournois (un match de bracket = un match online)
- [ ] Enregistrement automatique du résultat du match dans l'entité `Match` du tournoi
- [ ] UI "Rejoindre mon match" depuis le bracket du tournoi
- [ ] Surrender, timer par tour, forfait auto au bout de X minutes d'inactivité
- [ ] Mode spectateur minimal (lecture seule du match)

**Assigné** : `@raphplt`

---

### Compléter la partie Sealed Products `P1` `Marketplace`

- [ ] Vue liste paginée + filtres (set, série, prix, état) sur `/marketplace/sealed`
- [ ] Page détail d'un produit scellé avec historique de prix et listings actifs
- [ ] Intégration dans le panier + flow checkout Stripe
- [ ] Gestion de stock (quantité) sur les listings scellés
- [ ] Seed enrichi : ajouter boosters, displays, ETB, decks préconstruits
- [ ] Bannière et mise en avant sur la home (`SealedProductsPreview`) avec tri par popularité
- [ ] Event tracking (view, add_to_cart) comme pour les cartes
- [ ] Endpoint public `GET /sealed-products/recent` déjà en place → brancher sur la home

**Assigné** : `@raphplt`

---

### Mobile – Architecture de base et services API `P0` `Mobile`

- [ ] Setup Expo Router + layout tabs (home, marketplace, collection, profile)
- [ ] Client API mobile (axios/ky) avec gestion JWT + refresh token
- [ ] Store Zustand partagé mobile (auth, user, preferences)
- [ ] Gestion du token sécurisé (expo-secure-store)
- [ ] Écran de splash + détection de session
- [ ] Thème Tailwind / NativeWind cohérent avec le web
- [ ] Hooks partagés (`useAuth`, `useApi`) – extraction éventuelle dans `packages/ui`
- [ ] Environnement `.env` mobile + configuration `NEXT_PUBLIC_API_URL` équivalente

**Assigné** : `@raphplt`

---

### Mobile – Authentification (login / register / mot de passe oublié) `P1` `Mobile` `Auth`

- [ ] Écrans `/auth/login`, `/auth/register`, `/auth/forgot-password`
- [ ] Intégration endpoints existants JWT + nouvel endpoint `POST /auth/forgot-password`
- [ ] Endpoint `POST /auth/reset-password` (token + nouveau mot de passe)
- [ ] Template email "Réinitialiser votre mot de passe" (Nodemailer / Resend)
- [ ] Validation Zod côté mobile (email, mot de passe, confirmation)
- [ ] Stockage du refresh token, auto-login au démarrage
- [ ] Écran "Mot de passe oublié" côté web également (parité avec mobile)

**Assigné** : `@Jounayd`

---

### Mobile – Consultation et gestion des tournois `P1` `Mobile` `Tournois`

- [ ] Écran liste des tournois (à venir, en cours, terminés)
- [ ] Écran détail d'un tournoi (description, participants, bracket)
- [ ] Bouton "Rejoindre" + "Se désinscrire"
- [ ] Affichage des matchs du joueur connecté (à jouer / joués)
- [ ] Notifications push pour "match à jouer" (via Expo Notifications / Firebase)
- [ ] Historique ELO du joueur connecté

**Assigné** : `@Jounayd`

---

### Mobile – Scan OCR de cartes Pokémon `P1` `Mobile` `Collection`

- [ ] Intégration caméra (expo-camera) + sélection depuis la galerie
- [ ] Appel à un service OCR (Google ML Kit / Cloud Vision / Tesseract) pour extraire le nom / numéro de la carte
- [ ] Endpoint API `POST /cards/match-ocr` : matching du texte extrait vers une carte Pokémon
- [ ] Écran de validation : l'utilisateur confirme la carte détectée
- [ ] Ajout automatique à la collection après validation
- [ ] Gestion des erreurs de reconnaissance (fallback manuel sur barre de recherche)
- [ ] Historique des scans récents

**Assigné** : `@aymardl`

---

### Mobile – Consultation de la collection + intégration scan `P1` `Mobile` `Collection`

- [ ] Écran "Ma collection" avec liste paginée + filtres (set, série, favoris)
- [ ] Vue détail carte + statut (possédée, wishlist, favoris)
- [ ] Bouton "Scanner une carte" accessible depuis la collection
- [ ] Pull-to-refresh + pagination infinie
- [ ] Écran wishlist et favoris
- [ ] Synchronisation offline basique (cache AsyncStorage) pour les dernières cartes vues

**Assigné** : `@aymardl`

---

### Système de notifications in-app + push `P1` `Support` `Communauté`

- [ ] Entité `Notification` (userId, type, title, message, read, link, createdAt, metadata)
- [ ] Endpoint `GET /notifications` (pagination, filtre read/unread)
- [ ] Endpoint `PATCH /notifications/:id/read` et `PATCH /notifications/read-all`
- [ ] Création automatique sur événements : tournoi démarré, match à jouer, badge débloqué, nouveau follower, vente réalisée, commande expédiée
- [ ] Icône cloche dans la navbar web avec compteur non-lues (websocket ou polling)
- [ ] Dropdown panel listant les notifications récentes
- [ ] Page `/notifications` pour l'historique complet
- [ ] Intégration Expo Notifications / Firebase Cloud Messaging côté mobile
- [ ] Registre des tokens push (`DeviceToken` entité) + endpoint `POST /notifications/register-device`
- [ ] Service d'envoi côté API (emails critiques + push) – email via Nodemailer / Resend

**Assigné** : `@peron_h`

---

### Profil public utilisateur + système de follow `P1` `Communauté`

- [ ] Entité `UserFollow` (followerId, followedId, createdAt)
- [ ] Endpoints `POST /users/:id/follow`, `DELETE /users/:id/unfollow`
- [ ] Endpoints `GET /users/:id/followers` et `GET /users/:id/following`
- [ ] Page publique `/users/:id` (pseudo, avatar, score ELO, decks publics, badges, historique tournois, stats marketplace)
- [ ] Bouton "Suivre" sur le profil public
- [ ] Compteurs followers / following
- [ ] Feed d'activité basique : `GET /feed` → decks publiés / tournois rejoints par les utilisateurs suivis
- [ ] Différenciation `/users/:id` (public) vs `/profile` (privé)

**Assigné** : `@soldrix`

---

### Classement global des joueurs (ELO / points) `P1` `Gamification`

- [ ] Endpoint `GET /ranking/global` avec pagination + filtre format / saison
- [ ] Calcul ELO agrégé (matchs tournois + matchs en ligne ranked)
- [ ] Page `/ranking` avec tableau top 100, recherche par pseudo, mise en avant du top 3
- [ ] Encart "Mon rang" sur le dashboard
- [ ] Badge "Top 10 / Top 100" à ajouter dans le système d'achievements

**Assigné** : `@Jounayd`

---

### Rapports / analytics pour les organisateurs de tournois `P2` `Tournois` `Support`

- [ ] Endpoint `GET /tournaments/:id/analytics` : nombre d'inscrits par jour, taux de remplissage, taux de participation, durée moyenne des matchs
- [ ] Page `/tournaments/:id/admin/analytics` accessible à l'organisateur uniquement
- [ ] Graphiques : courbe d'inscriptions, histogramme de résultats, heatmap des matchs par heure
- [ ] Export CSV des participants et résultats
- [ ] Rapport hebdomadaire automatique par email aux organisateurs actifs

**Assigné** : `@soldrix`

---

### Page actualités / annonces de tournois `P2` `Tournois`

- [ ] UI `/news` listant les articles (module `article` déjà présent côté API)
- [ ] UI `/news/:id` avec contenu complet + lien vers le tournoi associé
- [ ] Section "Actualités" sur la home (3 derniers articles)
- [ ] Formulaire de création d'article réservé aux organisateurs (`isPro`)
- [ ] Rich-text editor minimal (tiptap ou équivalent)
- [ ] Upload image de couverture (R2)

**Assigné** : `@soldrix`

---

### Qualité – Tests unitaires NestJS + middleware de logs `P2` `Tech debt`

- [ ] Tests unitaires pour `MarketplaceService`, `DeckService`, `CollectionService`, `TournamentService`, `MatchService` (#50)
- [ ] Ajouter un `LoggerMiddleware` qui log méthode, url, statut, durée, userId (#52)
- [ ] Formalisation du **schéma de base de données** dans `docs/` (diagramme + liste des entités) (#55)
- [ ] Augmenter la couverture à ≥ 40 % sur les modules marketplace et tournament
- [ ] Brancher la couverture Jest dans la pipeline GitHub Actions

**Assigné** : `@Jounayd` (tests) / `@peron_h` (middleware + schéma)

---

### Recommandations de cartes pour la collection `P1` `IA` `Collection`

- [ ] Endpoint `GET /ai/recommendations/collection` : cartes manquantes suggérées
- [ ] Algo v1 (rule-based) : complément de sets possédés partiellement, cartes de même série que les favoris, cartes populaires non possédées
- [ ] Composant `RecommendedCards` affiché sur la page collection
- [ ] Bouton "Ajouter à la wishlist" directement depuis la recommandation
- [ ] Prise en compte du budget (prix marketplace) comme filtre optionnel

**Assigné** : `@raphplt`

---

### Interface d'analyse de deck (front) `P1` `IA` `Collection`

- [ ] Page `/decks/:id/analysis` appelant `POST /ai/analyzeDeck`
- [ ] Affichage du score global + sous-scores (synergie, courbe, diversité)
- [ ] Graphique radar des axes du deck
- [ ] Liste des suggestions de cartes (cartes alternatives, cartes à retirer)
- [ ] Bouton "Analyser mon deck" sur la page de détail du deck
- [ ] État de chargement avec skeleton
- [ ] Historisation des analyses (`DeckAnalysisHistory`)

**Assigné** : `@raphplt`

## 6. Répartition par développeur

### @raphplt (pilotage + dev)

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #155 | Mobile – Architecture de base et services API | P0 | 5 |
| *new* | Finaliser le jeu TCG en ligne (stabilisation + tournoi) | P0 | 5 |
| #165 | Compléter les items scellés | P1 | 3 |
| #101 | Formulaire création/édition deck (carry-over) | P0 | 2 |
| #108 | Recommandations cartes collection (carry-over) | P1 | 3 |
| #104 | Interface analyse deck front (carry-over) | P1 | 2 |
| **Total** | | | **20** |

### @soldrix

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #112 | Système de badges / succès (carry-over) | P1 | 3 |
| #149 | Suivre un autre utilisateur (carry-over) | P1 | 2 |
| #150 | Profil public utilisateur (carry-over) | P1 | 3 |
| #121 | Rapports / analytics organisateurs tournois | P2 | 3 |
| *new* | Page actualités / annonces tournois | P2 | 2 |
| **Total** | | | **13** |

### @Jounayd

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #105 | Remplacer données mockées "Mes tournois" (carry-over) | P0 | 2 |
| #156 | Mobile – Authentification + mot de passe oublié | P1 | 3 |
| #158 | Mobile – Consultation et gestion des tournois | P1 | 3 |
| #113 | Classement global des joueurs ELO (carry-over) | P1 | 3 |
| #50 | Tests unitaires NestJS | P2 | 3 |
| **Total** | | | **14** |

### @aymardl

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #157 | Mobile – Scan OCR de cartes Pokémon | P1 | 5 |
| #159 | Mobile – Consultation collection + scan | P1 | 3 |
| #148 | Copier un deck existant (à fusionner) | P1 | 1 |
| #109 | Export de deck PDF / Image (à fusionner) | P2 | 1 |
| **Total** | | | **10** |

### @peron_h

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #106 | Système de notifications tournois push/email (carry-over) | P2 | 3 |
| *new* | Système de notifications in-app + push | P1 | 5 |
| #52 | Middleware de log des requêtes API | P2 | 1 |
| #55 | Schéma de base de données (documentation) | P0 | 2 |
| **Total** | | | **11** |

## 7. Planning prévisionnel

### Semaine 1 (16 → 22 avril) — Clôturer le carry-over + démarrer l'architecture mobile

- Fusionner les PR en attente (#148 copier deck, #109 export PDF).
- Finaliser #101 (formulaire deck) et #105 (mes tournois réelles).
- Terminer #165 (items scellés complets : listing, détail, checkout).
- Démarrer #155 (architecture mobile) et brancher l'auth mobile (#156).
- Kick-off stabilisation jeu en ligne (bugs evolution, reconnexion socket).

### Semaine 2 (23 → 29 avril) — Mobile avancé + notifications + communauté

- Mobile : écrans tournois (#158), collection + scan OCR (#157, #159).
- Lancer la refonte notifications in-app + push (entité + endpoints + cloche + FCM/Expo).
- Démarrer #149 (follow) et #150 (profil public).
- Poursuivre le badge system (#112) et les recommandations collection (#108).

### Semaine 3 (30 avril → 6 mai) — Analytics + classement + IA

- #113 Classement global ELO + encart dashboard.
- #121 Analytics organisateurs de tournois + export CSV.
- #104 Page d'analyse de deck front.
- Intégration match online ↔ bracket tournoi.
- Tests unitaires des modules critiques (#50).

### Semaine 4 (7 → 13 mai) — Polish + soutenance

- Page actualités / news + contenu de seed.
- Middleware de log (#52) + schéma BDD documenté (#55).
- QA globale mobile (crash-free, perfs, offline basique).
- Préparation démo : parcours web (marketplace + deck + tournoi + match online) + parcours mobile (auth + collection + scan).
- Rédaction du bilan du RUN 6.

## 8. Risques identifiés

- **Charge du RUN 6** : volume de carry-over très important (13 issues héritées du RUN 5) + toute la verticale mobile à livrer. Risque fort de reports si la semaine 1 dérape.
- **Mobile / OCR** : le scan OCR dépend d'un service externe (coût, qualité, quota). Prévoir un fallback manuel si la reconnaissance est trop imprécise.
- **Jeu en ligne** : la stabilité de la gateway Socket.io sous charge n'a pas encore été testée en condition de tournoi. Risque de régression au moment d'intégrer le match online dans le bracket.
- **Notifications push** : intégration Firebase / Expo Push Service = dépendance à une configuration externe (clés, certificats iOS / Android). Prévoir un spike technique en semaine 1.
- **Dette technique (tests)** : reportée depuis le RUN 2, elle devient critique. Un RUN sans tests minimums remettrait en question la fiabilité des features gamification / matchs.
- **Dépendances croisées** : notifications ↔ follow ↔ profil public ↔ badges. Séquencer le merge pour éviter les conflits (notifications d'abord, puis follow, puis enrichissement du profil public).
- **Parité web / mobile** : les endpoints d'auth doivent gérer à la fois les clients web (cookies / headers) et mobile (tokens stockés) → prévoir un review d'architecture auth au début du RUN.
