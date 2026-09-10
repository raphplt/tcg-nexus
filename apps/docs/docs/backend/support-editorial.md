---
title: Support, Contenu & Services Internes
---

Cette section documente les fonctionnalités d'assistance aux utilisateurs, la gestion de contenu éditorial (blog et FAQ), ainsi que les services d'infrastructure internes (stockage objet, messagerie transactionnelle et modèle outbox).

---

## 1. Support client & Gestion des litiges (`/support/tickets`)

Le module de support permet aux utilisateurs d'ouvrir des demandes d'assistance générale ou de déclarer des litiges liés à une commande sur la place de marché.

### Cycle de vie d'un ticket
- Statuts : `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`.
- **Lien avec la marketplace** : lorsqu'un litige est ouvert concernant une commande, les fonds correspondants sont automatiquement placés sous séquestre bloqué (`on_hold`) sur le grand livre du vendeur ([Marketplace & Grand livre](./marketplace)). La clôture du ticket libère ou rembourse les fonds selon la décision d'arbitrage.

### Endpoints
- `POST /support/tickets` (JWT) : créer un nouveau ticket de support (sujet, catégorie, message initial, ID de commande optionnel).
- `GET /support/tickets` (JWT) : lister les tickets ouverts par l'utilisateur connecté.
- `GET /support/tickets/:id` (JWT) : consulter le détail et le statut d'un ticket.
- `POST /support/tickets/:id/messages` (JWT) : publier une nouvelle réponse dans le fil de discussion.
- `GET /support/tickets/:id/messages` (JWT) : récupérer l'historique complet des messages échangés.
- `PATCH /support/tickets/:id/close` (JWT / Staff) : clôturer le ticket après résolution.

---

## 2. Contenu éditorial : Articles & FAQ

### Articles de blog (`/articles`)
Permet à l'équipe de publier des articles d'actualités, des récapitulatifs de tournois officiels ou des analyses du méta-game.

- `GET /articles` (Public) : liste paginée des articles publiés.
- `GET /articles/:id` ou `/:slug` (Public) : lecture complète d'un article.
- `POST /articles`, `PATCH /articles/:id`, `DELETE /articles/:id` (ADMIN / MODERATOR) : gestion éditoriale.

### FAQ dynamique (`/faq`)
Foire aux questions modifiable depuis l'interface d'administration et classée par thématiques (Paiements, Tournois, Scan de cartes, Compte).

- `GET /faq` (Public) : liste des questions/réponses actives regroupées par catégorie.
- `POST /faq`, `PATCH /faq/:id`, `DELETE /faq/:id` (ADMIN) : gestion des questions et des réponses.

---

## 3. Services d'infrastructure internes

Ces modules ne disposent pas d'endpoints publics directs mais soutiennent l'ensemble de la logique applicative :

### Stockage objet Cloudflare R2 (`storage`)
- Abstraction d'un client S3 compatible pour téléverser et distribuer les visuels de produits scellés, séries et photos de cartes via le CDN de Cloudflare (`https://cdn.tcg-nexus.org`).
- Activé en configurant les variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` et `R2_BUCKET_NAME`.

### Messagerie transactionnelle (`mail`)
- Service interne (`MailService`, `MailI18nService`) assurant l'envoi d'emails transactionnels (confirmation de commande, notification de livraison, réinitialisation de mot de passe, rappels de tournoi).
- Traduction automatique des templates d'emails selon la préférence linguistique du destinataire (`User.preferredLocale`).

### Événements de domaine & Pattern Outbox (`outbox`, `audit`)
- **Pattern Transactional Outbox** : chaque événement métier critique (changement de statut de commande, validation de round de tournoi) est enregistré dans la table `outbox_message` dans la même transaction PostgreSQL que l'entité modifiée.
- **Dépilement asynchrone garanti** : un dispatcher lit les messages en attente en posant un verrou consultatif PostgreSQL (`tcg-nexus:outbox-dispatcher`) pour empêcher tout double envoi.
- **Consommateurs idempotents** : la table `processed_event` garantit qu'un événement n'est exécuté qu'une seule fois par chaque service récepteur (`runOnce`).
- **Journal d'audit (`audit_log`)** : consigne les opérations sensibles effectuées par les administrateurs et modérateurs pour garantir une traçabilité totale.
