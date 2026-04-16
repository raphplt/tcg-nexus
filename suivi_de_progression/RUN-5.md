# Fiche de progression – RUN 5 (2026-02-27)

## 1. Contexte

- Numéro et date du RUN : 5 – 2026-02-27
- Durée prévue : ~4 semaines
- Équipe active : `@raphplt`, `@soldrix`, `@Jounayd`, `@aymardl`, `@peron_h`
- Objectifs globaux du RUN :
  - Terminer les **issues en cours du RUN 4** (carry-over).
  - Développer les fonctionnalités de **Gamification** (badges, défis, classement ELO).
  - Implémenter le **Dashboard utilisateur** avec statistiques personnelles.
  - Renforcer l'**IA & Outils stratégiques** (recommandations, alternatives, comparateur de decks).
  - Poser les bases de la **Communauté** (profil public, système de follow).
  - Ajouter des fonctionnalités de **Support** (notifications, tickets).
  - Améliorer l'**Authentification** (reset password) et les **Tournois** (matchs, actualités).

## 2. Bilan du RUN précédent

- Objectifs visés lors du RUN 4 :
  - Refonte complète du Marketplace avec nouvelles pages et features avancées.
  - Implémenter un système de panier avec gestion des commandes.
  - Finaliser la gestion des Decks avec pages dédiées (liste, détail, création, édition).
  - Améliorer la Collection avec gestion des favoris et wishlist.
  - Ajouter un système de tracking et analytics pour les cartes.
  - Implémenter des métriques de popularité et tendances pour les cartes.
- Objectifs **atteints** :
  - Marketplace refonte complète (accueil, catalogue, détail carte, profil vendeur) ✅
  - Statistiques de carte avec historique des prix et graphiques ✅
  - Ajout au panier avec tracking d'événements ✅
  - Profil vendeur avec statistiques détaillées ✅
  - Gestion complète des decks (liste, création, édition, détail) ✅
  - Collection avec wishlist et favoris ✅
  - Système de tracking/analytics cartes (popularité, tendances) ✅
  - Intégration Stripe (payment intent, webhook) ✅
  - Page checkout avec récapitulatif et paiement ✅
  - Endpoint d'analyse de deck (`POST /ai/analyzeDeck`) ✅
- Objectifs **partiellement atteints** :
  - Formulaire création/édition de deck avec sélection de cartes (#101) — en cours ❗
  - Remplacement des données mockées "Mes tournois" (#105) — en cours ❗
  - Système de badges/succès (#112) — en cours ❗
  - Interface d'analyse de deck côté front (#104) — en cours ❗
- Objectifs **non atteints** :
  - Tests unitaires et E2E (reportés encore une fois)
  - Historique des tournois ELO (#107) — en attente de merge

## 3. Issues carry-over du RUN 4

| Issue | Titre | Priorité | Statut | Assigné |
| ----- | ----- | -------- | ------ | ------- |
| #101 | Formulaire de création/édition de deck avec sélection de cartes | P0 | En cours | @raphplt |
| #105 | Remplacer les données mockées "Mes tournois" par des données réelles | P0 | En cours | @Jounayd |
| #104 | Interface d'analyse de deck côté front | P1 | En cours | @raphplt |
| #112 | Système de badges / succès (achievements) | P1 | En cours | @soldrix |
| #107 | Historique des tournois d'un joueur (ELO) | P1 | À fusionner | @Jounayd |

## 4. Issues existantes à intégrer au sprint

| Issue | Titre | Priorité | Labels | Assigné |
| ----- | ----- | -------- | ------ | ------- |
| #113 | Classement global des joueurs (ELO/points) | P1 | Gamification | @Jounayd |
| #114 | Tableau de bord utilisateur (stats personnelles) | P1 | Feature | @soldrix |
| #108 | Système de recommandations de cartes pour collection | P1 | IA, Collection | @raphplt |
| #109 | Export de deck au format PDF/Image | P2 | Collection | @aymardl |
| #119 | Système de tickets support/aide | P2 | Support | @peron_h |

## 5. Nouveaux tickets à créer

### Suivre un autre utilisateur `P1` `Communauté`

- [ ] Entité `UserFollow` (followerId, followedId, createdAt)
- [ ] Endpoint `POST /users/:id/follow` et `DELETE /users/:id/unfollow`
- [ ] Endpoint `GET /users/:id/followers` et `GET /users/:id/following`
- [ ] Bouton "Suivre" sur le profil public d'un utilisateur
- [ ] Compteurs followers/following affichés sur le profil
- [ ] Feed d'activité basique : decks publiés et tournois rejoints par les utilisateurs suivis
- [ ] Endpoint `GET /feed` retournant les actions récentes des utilisateurs suivis

**Assigné** : `@soldrix`

---

### Profil public utilisateur `P1` `Communauté`

- [ ] Page `/users/:id` accessible sans authentification
- [ ] Affichage pseudo, avatar, date d'inscription, score ELO
- [ ] Section decks publics de l'utilisateur
- [ ] Section badges obtenus
- [ ] Historique de tournois (résultats)
- [ ] Statistiques marketplace (nombre de ventes, note moyenne)
- [ ] Bouton "Suivre" (lié au ticket "Suivre un autre utilisateur")
- [ ] Différencier le profil public (`/users/:id`) du profil privé (`/profile`)

**Assigné** : `@soldrix`

---

### Gestion des matchs d'un tournoi (enregistrer les scores) `P1` `Tournois`

- [ ] Entité `Match` (tournamentId, player1Id, player2Id, score1, score2, round, status)
- [ ] Service de génération automatique du bracket (arbre de tournoi)
- [ ] Endpoint `POST /tournaments/:id/matches/generate` (générer les matchs du round)
- [ ] Endpoint `PATCH /matches/:id/score` (enregistrer le résultat)
- [ ] Endpoint `GET /tournaments/:id/bracket` (récupérer l'arbre complet)
- [ ] Composant front `TournamentBracket` affichant l'arbre des matchs
- [ ] Formulaire de saisie des scores pour l'organisateur
- [ ] Avancement automatique des gagnants au round suivant
- [ ] Détermination et affichage du vainqueur final

**Assigné** : `@raphplt`

---

### Proposer des cartes alternatives dans un deck `P2` `IA`

- [ ] Endpoint `GET /ai/alternatives/:cardId` retournant des cartes substituables
- [ ] Algo : même type d'énergie + coût similaire
- [ ] Algo : même rôle dans le deck (attaquant, support, énergie)
- [ ] Algo : même set ou même série pour cohérence
- [ ] Composant `AlternativeCards` affiché sur la page détail d'un deck à côté de chaque carte
- [ ] Bouton "Remplacer" pour swapper directement dans le deck en édition
- [ ] Prise en compte du budget (prix marketplace) comme critère optionnel

**Assigné** : `@aymardl`

---

### Comparateur de decks `P2` `Collection`

- [ ] Page `/decks/compare` avec sélection de 2 decks
- [ ] Vue côte à côte : composition, stats, distribution des types
- [ ] Graphique radar comparatif (pokémon, trainers, énergies, coût moyen, diversité types)
- [ ] Liste des cartes en commun et des cartes uniques à chaque deck
- [ ] Comparaison du score d'analyse si disponible
- [ ] Bouton "Comparer" accessible depuis la liste des decks (sélection par checkbox)

**Assigné** : `@aymardl`

---

### Système de notifications in-app `P2` `Support`

- [ ] Entité `Notification` (userId, type, title, message, read, link, createdAt)
- [ ] Endpoint `GET /notifications` (liste paginée, filtre read/unread)
- [ ] Endpoint `PATCH /notifications/:id/read` et `PATCH /notifications/read-all`
- [ ] Création automatique sur événements clés : tournoi commencé, match à jouer, badge débloqué, nouveau follower, vente réalisée
- [ ] Icône cloche dans la navbar avec compteur de non-lues
- [ ] Dropdown panel listant les notifications récentes
- [ ] Page `/notifications` pour l'historique complet
- [ ] Marquage auto comme lu au clic

**Assigné** : `@Jounayd`

---

### Réinitialisation de mot de passe `P2` `Auth`

- [ ] Endpoint `POST /auth/forgot-password` (envoi email avec token)
- [ ] Endpoint `POST /auth/reset-password` (validation token + nouveau mot de passe)
- [ ] Génération d'un token sécurisé avec expiration (1h)
- [ ] Template email "Réinitialiser votre mot de passe"
- [ ] Intégration service email (Nodemailer / SendGrid / Resend)
- [ ] Page `/auth/forgot-password` avec champ email
- [ ] Page `/auth/reset-password?token=xxx` avec formulaire nouveau mot de passe
- [ ] Lien "Mot de passe oublié ?" sur la page de connexion

**Assigné** : `@Jounayd`

---

### Défis quotidiens / hebdomadaires `P2` `Gamification`

- [ ] Entité `Challenge` (titre, description, type daily/weekly, condition, récompense XP)
- [ ] Entité `UserChallenge` (progression, complété, date)
- [ ] Service `ChallengeService` avec rotation cron (daily minuit, weekly lundi)
- [ ] Pool de défis prédéfinis (~10 : "Ajouter 3 cartes", "Consulter 5 decks", "Participer à 1 tournoi", etc.)
- [ ] Endpoint `GET /challenges/active` (défis du jour/semaine)
- [ ] Endpoint `POST /challenges/:id/progress` (incrémenter progression)
- [ ] Composant `ChallengeCard` avec barre de progression
- [ ] Section défis sur le dashboard ou page `/challenges`
- [ ] Animation de complétion + attribution XP

**Assigné** : `@aymardl`

---

### Copier un deck existant `P2` `Collection`

- [ ] Endpoint `POST /decks/:id/clone` (copie pour l'utilisateur connecté)
- [ ] Vérification que le deck source est public
- [ ] Copie nom (suffixe "- Copie"), format et toutes les cartes
- [ ] Bouton "Cloner ce deck" sur la page détail des decks publics
- [ ] Redirection vers la page d'édition du deck cloné

**Assigné** : `@aymardl`

---

### Page actualités / annonces de tournois `P2` `Tournois`

- [ ] Endpoint `GET /articles?category=tournament` filtré par catégorie
- [ ] Page `/news` avec liste des actualités (image, titre, date, extrait)
- [ ] Page `/news/:id` avec contenu complet de l'article
- [ ] Section "Actualités" sur la page d'accueil (3 dernières news)
- [ ] Formulaire de création d'article réservé aux organisateurs (`isPro`)
- [ ] Lien vers le tournoi concerné depuis l'annonce

**Assigné** : `@soldrix`

## 6. Répartition par développeur

### @raphplt (pilotage + dev)

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #101 | Formulaire création/édition deck (carry-over) | P0 | 3 |
| #104 | Interface analyse de deck front (carry-over) | P1 | 2 |
| #108 | Recommandations de cartes pour collection | P1 | 3 |
| *new* | Gestion des matchs d'un tournoi | P1 | 5 |
| **Total** | | | **13** |

### @soldrix

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #112 | Système de badges/succès (carry-over) | P1 | 3 |
| #114 | Tableau de bord utilisateur | P1 | 3 |
| *new* | Profil public utilisateur | P1 | 3 |
| *new* | Suivre un autre utilisateur | P1 | 2 |
| *new* | Page actualités / annonces tournois | P2 | 2 |
| **Total** | | | **13** |

### @Jounayd

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #105 | Remplacer données mockées "Mes tournois" (carry-over) | P0 | 2 |
| #107 | Historique tournois ELO (merge) | P1 | 1 |
| #113 | Classement global des joueurs ELO | P1 | 3 |
| #119 | Système tickets support/aide | P2 | 3 |
| *new* | Système de notifications in-app | P2 | 3 |
| *new* | Réinitialisation de mot de passe | P2 | 2 |
| **Total** | | | **14** |

### @aymardl

| Ticket | Titre | Priorité | Estimate |
| ------ | ----- | -------- | -------- |
| #109 | Export de deck PDF/Image | P2 | 3 |
| *new* | Proposer des cartes alternatives dans un deck | P2 | 3 |
| *new* | Comparateur de decks | P2 | 3 |
| *new* | Défis quotidiens / hebdomadaires | P2 | 3 |
| *new* | Copier un deck existant | P2 | 1 |
| **Total** | | | **13** |

## 7. Planning prévisionnel

### Semaine 1 — Finir le carry-over + démarrer P1

- Clôturer les 5 issues en cours du RUN 4 (#101, #105, #104, #112, #107)
- Démarrer les issues P1 existantes (#113, #114, #108)
- Démarrer les nouveaux tickets P1 (profil public, follow, matchs tournoi)

### Semaine 2 — P1 en cours + premiers P2

- Finaliser les issues P1
- Démarrer les tickets P2 (notifications, défis, alternatives, comparateur)
- Review croisées entre devs

### Semaine 3 — P2 + intégration

- Finaliser les tickets P2
- Démarrer les tickets restants (reset password, actualités, clone deck, export)
- Tests d'intégration manuels entre features (ex : badge déclenché par un défi complété)

### Semaine 4 — Polish + démo

- Corriger les bugs remontés lors des tests
- Finaliser l'UX (skeletons, toasts, responsive)
- Préparer la démo de fin de RUN
- Rédiger le bilan du RUN 5

## 8. Risques identifiés

- **Carry-over important** : 5 issues non terminées du RUN 4 qui consommeront la semaine 1. Si elles traînent, elles grignoteront les nouvelles features.
- **Absence de tests** : les tests sont reportés depuis le RUN 2. La complexité croissante du projet augmente le risque de régressions.
- **Gestion des matchs** : le système de bracket est la feature la plus complexe du sprint. Risque de dépassement sur l'estimation.
- **Dépendances entre tickets** : le profil public et le système de follow sont liés ; le dashboard dépend partiellement des badges et du classement ELO.
