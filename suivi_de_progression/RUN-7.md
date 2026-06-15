# Fiche de progression – RUN 7 (2026-05-28)

## 1. Contexte

- **Numéro et date du RUN** : 7 – 2026-05-28
- **Durée prévue** : ~4 semaines
- **Équipe active** : `@raphplt`, `@soldrix`, `@Jounayd`, `@aymardl`, `@peron_h`
- **Objectifs globaux du RUN** :
  - **Finaliser les fonctionnalités mobiles** (Auth mobile, scan OCR de cartes, intégration de la collection et gestion des tournois dans l'application Expo).
  - **Lancer et implémenter la couche Communauté** (profil public, système de follow).
  - **Déployer les outils IA & Stratégiques** (interface d'analyse de deck front, recommandations personnalisées de cartes).
  - **Améliorer la Gamification & les Tournois** (classement global ELO, notifications de matchs en cours).
  - **Renforcer le Support & la résilience technique** (logs d'API, documentation du schéma de base de données, tests NestJS).

---

## 2. Bilan du RUN précédent (RUN 6)

### Objectifs visés lors du RUN 6 :
- Correction UI & support complet des items scellés dans le marketplace (panier, checkout, commandes).
- Rapports et analytics organisateurs de tournois (#121) avec export.
- Stabilisation du TCG en ligne (gateway de match casual, timers d'inactivité, auto-forfeit).
- Initialisation et architecture de l'application mobile Expo.

### Objectifs **atteints** :
- **Support des items scellés dans le Marketplace** ✅ : Le panier (`CartDropdown.tsx`, `cart/page.tsx`), la page de paiement (`checkout/page.tsx`), les reçus de commande (`orders/[id]/page.tsx`, `OrderList.tsx`) et l'administration (`AdminOrdersTable.tsx`) gèrent correctement les produits scellés (images CDN, condition, nom traduit) sans planter.
- **Rapports & Analytics organisateurs (#121)** ✅ : L'endpoint backend `getTournamentStats` calcule la participation, l'activité des matchs et les performances, et le front les affiche dynamiquement.
- **Stabilisation du TCG en ligne (#153)** ✅ : Audit et fiabilisation des timers d'inactivité de `MatchGateway` et de l'auto-forfeit de `MatchOnlineService`. Tous les tests passent (721 tests verts).
- **Fondations de l'application mobile Expo** ✅ : La structure et la navigation de base d'Expo ont été posées dans `apps/mobile`.

### Objectifs **partiellement atteints** (carry-over vers RUN 7) :
- **Formulaire de deck interactif (#101)** ❗ : Formulaire avancé avec sélection en cours.
- **Scan OCR mobile (#157)** ❗ : Intégration en cours (dépendances manquantes de `expo-camera` et `expo-image-manipulator` à fixer).
- **Notifications de tournoi push/email (#106)** ❗ : Logique in-app et push à finaliser.
- **Gestion des tournois sur mobile (#158)** ❗ : Vues mobiles en cours.

### Objectifs **non atteints** :
- **Système de follow / communauté (#149 / #150)** ❌ : Non démarré côté backend.
- **Classement global ELO (#113)** ❌ : Non finalisé au niveau du dashboard.
- **Interface d'analyse de deck front (#104)** ❌ : Reportée.

---

## 3. Issues carry-over du RUN 6

| Issue | Titre | Priorité | Statut actuel | Assigné |
| ----- | ----- | -------- | ------------- | ------- |
| #101 | Formulaire de création/édition de deck avec sélection de cartes | P0 | En cours | @raphplt |
| #157 | Scan OCR de cartes Pokémon pour import de collection (mobile) | P0 | En cours | @aymardl |
| #158 | Consultation et gestion des tournois (mobile) | P1 | En cours | @Jounayd |
| #159 | Consultation de la collection et intégration avec le scan (mobile) | P1 | En cours | @aymardl |
| #156 | Authentification – login, register, mot de passe oublié (mobile) | P1 | À faire | @Jounayd |
| #104 | Interface d'analyse de deck côté front | P1 | À faire | @raphplt |
| #108 | Recommandations de cartes pour la collection | P1 | À faire | @raphplt |
| #113 | Classement global des joueurs (leaderboard ELO) | P1 | En cours | @Jounayd |
| #149 | Suivre un autre utilisateur (Follow) | P1 | Non démarré | @soldrix |
| #150 | Profil public utilisateur | P1 | Non démarré | @soldrix |
| #106 | Système de notifications de tournoi (push / email) | P2 | En cours | @peron_h |
| #52  | Middleware de log des requêtes API | P2 | À faire | @peron_h |
| #55  | Documentation du schéma de base de données | P2 | À faire | @raphplt |
| #50  | Écriture des tests unitaires NestJS | P2 | En cours | @Jounayd |

---

## 4. Planification des nouvelles fonctionnalités (Issues basées sur la Story Map v3)

Pour compléter la Story Map de la **Version 3**, les nouveaux tickets ci-dessous sont intégrés au RUN 7 :

### 🌐 Authentification & Profil (V3)
- **SSO Google & Discord** (`P1`) : Intégration d'OAuth2 pour permettre une connexion rapide en un clic côté web et mobile.
- **Préférences utilisateur** (`P2`) : Gestion des préférences d'affichage (mode sombre, activation/désactivation des notifications push).

### 🏆 Tournois & Matchs (V3)
- **Système de litiges (disputes)** (`P2`) : Formulaire permettant de contester le score d'un match de tournoi en téléversant une capture d'écran de preuve, avec notification de l'arbitre.
- **Notifications de match en cours** (`P1`) : Alerte push en temps réel lorsqu'un adversaire est trouvé ou qu'un match de round commence.

### 🃏 Collection & Decks (V3)
- **Export de Deck PDF/CSV** (`P2`) : Module d'exportation pour imprimer des decklists officielles ou les importer dans d'autres simulateurs.
- **Comparateur de decks avancés** (`P2`) : Vue comparative graphique (radar chart) analysant la répartition des types de cartes entre deux decks.

### 🤝 Partage & Communauté (V3)
- **Partage de decks publics & Posts** (`P2`) : Possibilité pour les utilisateurs de publier de courts articles/posts directement liés à un deck partagé sur leur profil.

### 🎁 Récompenses & Boutique (V3)
- **Boutique d'échange (Gamification)** (`P3`) : Utilisation des points de récompense (XP/Jetons accumulés par les défis journaliers) pour débloquer des skins virtuels de cartes ou des badges exclusifs.

---

## 5. Répartition par développeur

### `@raphplt` (Lead Dev)
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| #101 | Formulaire interactif de création de deck (Web) | P0 | 3 |
| #104 | Interface d'analyse stratégique de deck (Front) | P1 | 3 |
| #108 | Recommandations de cartes personnalisées (IA) | P1 | 3 |
| *new* | Système de litiges et arbitrage de matchs | P2 | 3 |
| #55 | Documentation et validation du schéma BDD | P2 | 1 |
| **Total** | | | **13** |

### `@aymardl`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| #157 | Intégration et débogage du scan OCR (Mobile Expo) | P0 | 4 |
| #159 | Collection utilisateur & intégration scan (Mobile) | P1 | 3 |
| *new* | Export de Deck (PDF/CSV) | P2 | 2 |
| *new* | Comparateur de decks graphiques | P2 | 3 |
| **Total** | | | **12** |

### `@Jounayd`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| #156 | Authentification mobile (Login/Register/SSO) | P1 | 4 |
| #158 | Gestion et consultation des tournois (Mobile) | P1 | 3 |
| #113 | Leaderboard global et ELO des joueurs | P1 | 3 |
| #50 | Tests unitaires NestJS (couverture critique) | P2 | 2 |
| **Total** | | | **12** |

### `@soldrix`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| #149 | Création de la relation Follow backend & UI | P1 | 3 |
| #150 | Écran & Page de profil public utilisateur | P1 | 3 |
| *new* | Connexion SSO Google & Discord | P1 | 3 |
| *new* | Flux de publication de posts & decks partagés | P2 | 3 |
| **Total** | | | **12** |

### `@peron_h`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| #106 | Système de notifications push / courriels de tournois | P1 | 4 |
| *new* | Alerte de match en cours (Push notifications) | P1 | 3 |
| #52 | Middleware de journalisation et audit des requêtes API | P2 | 3 |
| *new* | Configuration des préférences de notifications | P2 | 2 |
| **Total** | | | **12** |

---

## 6. Planning prévisionnel du RUN 7

### Semaine 1 (28 mai → 3 juin) : Focus Mobile & Sécurisation
- Débogage de la configuration d'Expo (dépendances d'appareil pour la caméra/manipulation d'images).
- Intégration de l'authentification mobile et connexion SSO.
- Validation finale du formulaire de création de deck (Web).

### Semaine 2 (4 juin → 10 juin) : Social & Engagement
- Implémentation du système de Follow et des profils publics.
- Finalisation du scan OCR de cartes Pokémon et liaison avec la collection mobile.
- Leaderboard ELO public.

### Semaine 3 (11 juin → 17 juin) : IA & Outils Stratégiques
- Interface front d'analyse de deck et recommandations de cartes IA.
- Module d'export de decks (PDF/CSV) et comparateur de decks.
- Système de litiges de scores de matchs.

### Semaine 4 (18 juin → 24 juin) : Intégration, Tests & Polish
- Intégration des notifications push et email.
- Middleware de logging d'API et tests unitaires NestJS.
- QA générale (tests de non-régression sur le TCG en ligne et le marketplace).
- Bilan et démonstration finale du RUN 7.

---

## 7. Risques identifiés & Atténuations

1. **Dépendances Expo complexes (Caméra / OCR)** :
   * *Risque* : Blocage sur la compilation native de `expo-camera` et `expo-image-manipulator`.
   * *Atténuation* : spike technique dès le jour 1 de la semaine 1 pour isoler les dépendances. Mise en place d'un fallback d'import manuel.
2. **Synchronisation en temps réel des notifications de match** :
   * *Risque* : Perte ou délai de réception des notifications push de début de match.
   * *Atténuation* : Utilisation combinée de Socket.io pour les clients actifs (in-app) et Firebase Cloud Messaging (FCM) / Expo Push Service pour l'arrière-plan.
3. **Complexité des flux communautaires (Follow/Posts)** :
   * *Risque* : Surcharge relationnelle dans la base de données PostgreSQL.
   * *Atténuation* : Indexation rigoureuse des tables de relation de follow et pagination stricte sur les flux de posts.
