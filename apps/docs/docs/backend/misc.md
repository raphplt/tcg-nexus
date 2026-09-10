---
title: Recherche, Panier & Modules Utilitaires
---

Cette page documente les modules transverses et utilitaires de l'API qui complètent les grands domaines métier.

---

## 1. Panier d'achat (`/user-cart`)

Le panier persistant prépare le checkout sur la place de marché (voir [Marketplace & Paiements](./marketplace)) :

- **Règle de devise unique** : un panier ne peut combiner des articles libellés dans des devises distinctes (l'ajout d'une annonce dans une devise différente est rejeté).
- Une ligne de panier référence une annonce (`Listing`) avec une quantité demandée.

### Endpoints
- `GET /user-cart/me` (JWT) : panier de l'utilisateur connecté avec détail des lignes, sous-totaux et frais de port prévisionnels.
- `POST /user-cart/items` (JWT) : ajouter une annonce au panier.
- `PATCH /user-cart/items/:id` (JWT) : ajuster la quantité d'une ligne de panier.
- `DELETE /user-cart/items/:id` (JWT) : retirer un article du panier.
- `DELETE /user-cart/me/clear` (JWT) : vider l'ensemble du panier.

---

## 2. Moteur de recherche unifié (`/search`)

Recherche globale plein-texte à travers l'ensemble des entités du catalogue (cartes, extensions, séries et produits scellés) :

- `GET /search` (Public) : recherche générale avec filtres et pagination.
- `GET /search/suggestions` (Public) : autocomplétion rapide pour les barres de recherche de l'interface.
- `GET /search/suggestions/preview` (Public) : aperçu enrichi avec vignettes et correspondances exactes.
- `GET /search/suggestions/detail` (Public) : autocomplétion avec détails des extensions associées.

---

## 3. Tableau de bord & Statistiques (`/dashboard`, `/statistics`)

### Tableau de bord agrégé (`/dashboard`)
Fournit un point d'entrée unique optimisé pour l'écran d'accueil connecté :
- `GET /dashboard` (JWT) : agrège la valeur estimée de la collection, les tournois actifs et à venir, les notifications non lues, les commandes en cours de livraison et les défis prêts à être réclamés.

### Métriques & Fréquentation (`/statistics`)
- Collecte et analyse les métriques d'activité sur la plateforme (volumes d'échanges, cartes les plus recherchées, taux de conversion en tournois).

---

## 4. Opérations Administratives (`/admin/ops`)

Réservé aux profils `admin`, ce module regroupe les fonctions de maintenance système et de surveillance :

- `GET /admin/ops/metrics` : compteurs d'intégrité (messages Outbox en échec, compensations de paiement en attente, réservations de stock périmées).
- `POST /admin/ops/orders/expire-stale` : balayage d'expiration des réservations de stock abandonnées.
- `GET /admin/ops/settlement/reconcile` : vérification comptable de l'équilibre entre les entrées du grand livre vendeur et les soldes réels.
- `GET /admin/ops/payments/compensation` : liste des paiements tardifs nécessitant une compensation financière.
- `POST /admin/ops/payments/:id/compensate` : exécution d'un remboursement compensatoire audité sous clé d'idempotence.

---

## 5. Modules Spécialisés

Les fonctionnalités suivantes disposent de leur propre documentation détaillée :

- **[Module IA & Deck Insights](./ai)** : moteur déterministe local, détection d'archétypes et similarité vectorielle `pgvector`.
- **[Mini-jeux](./mini-games)** : Le Juste Prix et Case Opening (boosters), modes solo/local REST et duels multijoueurs WebSocket.
- **[Gamification & Réseau Social](./social-gamification)** : Badges, défis, relations d'abonnement et classement mondial ELO/XP.
- **[Support & Contenu](./support-editorial)** : Tickets d'assistance, blog, FAQ dynamique, modèle outbox et stockage Cloudflare R2.
