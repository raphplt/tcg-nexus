# Fiche de progression – RUN 8 (2026-07-07)

## 1. Contexte

- **Numéro et date du RUN** : 8 – 2026-07-07
- **Durée prévue** : ~4 semaines (jusqu'au 4 août 2026)
- **Équipe active** : `@raphplt`, `@soldrix`, `@Jounayd`, `@aymardl`, `@peron_h`
- **Objectifs globaux du RUN** :
  - **Déployer l'authentification SSO** (Google et Discord) sur l'ensemble des plateformes (Web et Mobile).
  - **Lancer et implémenter le système de litiges et d'arbitrage** pour sécuriser les tournois.
  - **Finaliser les outils de partage et communautaires** (flux d'actualités/posts liés aux decks partagés).
  - **Enrichir la Gamification** avec la boutique d'échange de points (XP/badges/cosmétiques) et le leaderboard des mini-jeux.
  - **Ajouter des fonctionnalités d'export et comparaison** (comparateur radar multi-decks et export PDF/CSV).
  - **Optimiser les performances et la résilience technique** (logging API, performances de notifications et indexation de recherche CLIP).

---

## 2. Bilan du RUN précédent (RUN 7)

### Objectifs visés lors du RUN 7 :
- Finalisation des fonctionnalités mobiles (Auth mobile, scan OCR, intégration de la collection et gestion des tournois dans Expo).
- Lancement de la couche Communauté (profil public, système de follow).
- Déploiement des outils IA & Stratégiques (analyse de deck front, recommandations IA).
- Amélioration de la Gamification & des Tournois (classement global ELO, notifications push de matchs).
- Renforcement du Support & de la résilience technique (logs d'API, documentation BDD, tests NestJS).

### Objectifs **atteints** :
- **Optimisation et débogage du scan OCR (Mobile Expo)** ✅ : Implémentation d'un pipeline robuste de vision (filtrage, rognage automatique, correction d'orientation Tesseract OSD, extraction de ROI). Ajout de la recherche visuelle de similarités via CLIP embeddings (`d20ac48`), visual disambiguation, burst mode de capture (best-of-N frames) et optimisation séquentielle des images pour éviter les crashs mémoire.
- **Collection et Pokedex Mobile** ✅ : Vues mobiles complètes avec tri, recherche et filtres complexes (`CollectionScreen` et `PokedexView`). Support du Master Set pour l'extension "Étincelles Déferlantes" avec gestion dynamique des raretés et états des cartes.
- **Authentification Mobile Expo** ✅ : Écrans de Login / Register et stockage sécurisé des jetons JWT via `expo-secure-store`.
- **Tournois & Matchs sur mobile** ✅ : Vues de consultation des tournois sur l'application Expo.
- **Leaderboard global ELO** ✅ : Backend de calcul ELO (`ranking` module) et interface de classement public opérationnels.
- **Système de notifications Push & In-App (PR #191)** ✅ : Implémentation du service de notifications complet avec enregistrement des tokens d'appareils mobiles.
- **Profil Public & Relations de Follow (PR #181)** ✅ : Backend de follow (`user-follow` module) et profils publics fonctionnels, envoyant des notifications en temps réel lors de follow/unfollow.
- **Analyse de Deck & IA** ✅ : Formulaire interactif de decks (Web), page d'analyse de deck stratégique dotée d'un radar chart (`DeckRadarChart`) et de recommandations personnalisées générées par IA.
- **Documentation & CI/CD** ✅ : Rédaction complète de `database-schema.md` décrivant l'architecture de la BDD. Pipelines GitHub Actions et script de synchronisation vers GitLab Etna en place. Création des Dockerfiles de déploiement pour tous les services.
- **Migration R2 & Card Sync** ✅ : Outil d'automatisation `CardSyncService` pour synchroniser le catalogue avec TCGdex (y compris l'extension Pocket) et migration des images locales vers Cloudflare R2.

### Objectifs **partiellement atteints** (carry-over vers RUN 8) :
- **Authentification SSO Google & Discord** ❗ : Les flux d'authentification sociale n'ont pas été finalisés sur le backend.
- **Préférences utilisateur** ❗ : Les thèmes (sombre/clair/système) et devises (EUR/USD) sont paramétrables, mais la gestion des préférences fines de notifications (push vs email) est à faire.

### Objectifs **non atteints** (carry-over vers RUN 8) :
- **Export de Deck PDF/CSV** ❌ : Reporté.
- **Comparateur de decks avancés** ❌ : Le radar chart est limité à un seul deck, la vue comparative multi-decks n'a pas été développée.
- **Système de litiges et arbitrage de matchs** ❌ : Reporté.
- **Boutique d'échange (Gamification)** ❌ : Reporté.
- **Middleware de journalisation & Audit des requêtes API** ❌ : Reporté.
- **Flux de publication de posts & decks partagés** ❌ : Reporté.

---

## 3. Issues carry-over du RUN 7

| Issue | Titre | Priorité | Statut actuel | Assigné |
| ----- | ----- | -------- | ------------- | ------- |
| *new* | Authentification SSO Google & Discord (Backend) | P1 | À faire | @raphplt |
| *new* | Authentification SSO Google & Discord (Mobile) | P1 | À faire | @Jounayd |
| *new* | Flux communautaire : Publication de posts et decks partagés | P1 | À faire | @soldrix |
| *new* | Système de litiges (disputes) et arbitrage de scores | P1 | À faire | @raphplt |
| *new* | Boutique d'échange (Gamification) - Backend | P2 | À faire | @soldrix |
| *new* | Boutique d'échange (Gamification) - UI/Front | P2 | À faire | @aymardl |
| *new* | Comparateur de decks graphiques (Radar chart comparatif) | P2 | À faire | @raphplt |
| *new* | Export de Deck (PDF/CSV) | P2 | À faire | @aymardl |
| *new* | Middleware de journalisation et audit des requêtes API | P2 | À faire | @peron_h |
| *new* | Configuration des préférences de notifications (Push / Mail) | P2 | À faire | @peron_h |

---

## 4. Planification des nouvelles fonctionnalités (Issues basées sur la progression V3/V4)

Afin d'enrichir le produit et de consolider les avancées de la Story Map, les tickets suivants s'ajoutent au RUN 8 :

### 🎮 Mini-Jeux & Gamification
- **Leaderboard des Mini-Jeux** (`P2`) : Suivi des performances sur les jeux implémentés (Pokedle, Whos That Pokemon, juste-prix) avec historique et classement public.
- **Récompense de points de jeux** (`P2`) : Attribution automatique de points de boutique/XP lors des victoires sur les mini-jeux.

### 🌐 Profil Public & Communauté (Mobile)
- **Vues mobiles pour le profil public et les follows** (`P2`) : Intégration dans l'application Expo mobile pour consulter le profil d'un joueur, voir ses decks partagés et le suivre/s'abonner.

### 🃏 Optimisations Scan OCR & Vision (IA)
- **Visual search sous charge & Caching** (`P2`) : Système de cache pour les CLIP embeddings des cartes fréquemment scannées afin de limiter l'impact sur le service de vision.
- **Interface de Scan burst & Mode révision** (`P2`) : Amélioration de l'UI mobile pour le burst mode et le mode de révision des cartes détectées avant sauvegarde.

---

## 5. Répartition par développeur

### `@raphplt` (Lead Dev)
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| *new* | Authentification SSO Google & Discord (Backend OAuth2) | P1 | 3 |
| *new* | Système de litiges et arbitrage de matchs | P1 | 3 |
| *new* | Comparateur de decks graphiques (Radar comparatif) | P2 | 3 |
| *new* | Visual search sous charge & Caching CLIP | P2 | 3 |
| **Total** | | | **12** |

### `@aymardl`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| *new* | Export de Deck (PDF/CSV) | P2 | 3 |
| *new* | Boutique d'échange (Gamification) - UI/Front | P2 | 4 |
| *new* | Interface de Scan burst & Mode révision mobile | P2 | 3 |
| **Total** | | | **10** |

### `@Jounayd`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| *new* | Authentification SSO Google & Discord (Mobile Expo) | P1 | 4 |
| *new* | Leaderboard des Mini-Jeux et gains d'XP | P2 | 3 |
| *new* | Vues mobiles pour le profil public et les follows | P2 | 3 |
| **Total** | | | **10** |

### `@soldrix`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| *new* | Flux communautaire : Publication de posts et decks partagés | P1 | 5 |
| *new* | Boutique d'échange (Gamification) - Backend | P2 | 4 |
| **Total** | | | **9** |

### `@peron_h`
| Issue / Tâche | Titre | Priorité | Estimation (Jours) |
| --- | --- | :---: | :---: |
| *new* | Middleware de journalisation et audit des requêtes API | P2 | 3 |
| *new* | Configuration des préférences de notifications (Push / Mail) | P2 | 3 |
| *new* | Optimisation & File d'attente pour notifications de tournoi | P2 | 3 |
| **Total** | | | **9** |

---

## 6. Planning prévisionnel du RUN 8

### Semaine 1 (7 juillet → 13 juillet) : SSO, Litiges & Flux de posts
- Configuration et déploiement des stratégies Google & Discord SSO sur le backend NestJS.
- Modélisation de la base de données et endpoints pour le système de litiges d'arbitrage.
- Initialisation du module communautaire pour la publication de posts et le partage de decks.

### Semaine 2 (14 juillet → 20 juillet) : SSO Mobile & Boutique Gamification
- Intégration d'OAuth2 (`expo-auth-session`) dans l'application Expo mobile.
- Développement du backend de la boutique d'échange (achats, attribution de points/XP).
- Implémentation du flux de posts côté front-end Web (Feed).

### Semaine 3 (21 juillet → 27 juillet) : Outils Decks, Mini-Jeux & Mobile Social
- Développement du comparateur de decks (radar comparatif de deux decks).
- Module d'export de decks (PDF/CSV).
- Intégration du système de scores, leaderboard et gains sur les mini-jeux.
- Écrans de profil public et follow/unfollow sur l'application Expo mobile.

### Semaine 4 (28 juillet → 3 août) : Logging, Préférences, Optimisation & QA
- Middleware de logging d'API NestJS.
- Écran de configuration des préférences de notifications (Web et Mobile).
- Caching CLIP et optimisations de performance du scan.
- QA globale, tests E2E de non-régression et mise en production.

---

## 7. Risques identifiés & Atténuations

1. **OAuth2 dans l'écosystème Expo** :
   * *Risque* : Blocage sur la configuration des redirections universelles (deep linking) sous Android/iOS.
   * *Atténuation* : Utilisation des utilitaires recommandés d'Expo (`expo-web-browser` et `expo-auth-session`) et validation précoce sur simulateurs et appareils réels.
2. **Surcharge de stockage pour les preuves de litiges** :
   * *Risque* : Téléversement massif d'images volumineuses par les joueurs, saturant le stockage CDN.
   * *Atténuation* : Rognage et compression automatique des images côté client avant l'envoi vers le CDN R2, combinés à un archivage automatique post-résolution.
3. **Temps de réponse de la recherche visuelle sous forte charge** :
   * *Risque* : Latence élevée du service de vision lors de sessions de scan intenses.
   * *Atténuation* : Caching des résultats CLIP pour les cartes les plus scannées et mise en place d'un fallback d'OCR local si le serveur de vision dépasse un timeout défini.
