# Fiche de progression – RUN 1 (2025-06-13)

## 1. Contexte

* **Numéro et date du RUN** : 1 – 2025-06-13
* **Objectifs du RUN** :

  * Initialiser la structure du monorepo (TurboRepo).
  * Mettre en place un microservice `apps/fetch` récupérant toutes les cartes Pokémon existantes.
  * Créer les bases de l’API NestJS : modèles et routes CRUD pour `cards`, `sets`, `extensions`.
  * Débuter le front-end Next.js : page d’accueil affichant une carte aléatoire, recherche basique et routing.

## 2. Bilan du RUN précédent

Premier RUN – pas de bilan précédent

## 3. Avancement des User Stories

| User Story                                                                                | Statut  | Commentaires                                                            |
| ----------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| Récupérer toutes les cartes Pokémon existantes via le microservice `fetch`                | Done    | `apps/fetch` opérationnel, consommation de l’API publique Pokémon       |
| Exposer les modèles et routes CRUD pour `cards`, `sets` et `extensions` dans l’API NestJS | Done    | Modèles et contrôleurs créés, routes GET/POST/PUT/DELETE fonctionnelles |
| Afficher une carte aléatoire sur la page d’accueil du front-end                           | Done    | Page `/` affiche une carte tirée aléatoirement via l’API                |
| Implémenter une recherche basique de cartes par nom                                       | Done    | Barre de recherche et filtrage client en place                          |
| Mettre en place le routing basique entre pages (`/`, `/cards`, `/search`, `/tournaments`) | Done    | Utilisation de `next/link` et pages fonctionnelles                      |
| Consulter la liste des tournois pour en choisir un                                        | Blocked | Page `/tournaments` créée mais sans affichage dynamique                 |
| Créer un compte via email et mot de passe                                                 | Blocked | Module `user` stub, authentification non implémentée                    |
| Créer un deck en ajoutant des cartes depuis sa collection                                 | Blocked | Entité `Deck` non définie                                               |
| Mettre en vente une carte avec un prix fixé                                               | Blocked | Marketplace non développé                                               |
| Consulter sa collection personnelle                                                       | Blocked | Routes API manquantes et front-end non implémenté                       |
| Recevoir une recommandation de deck basée sur ses cartes et le méta actuel                | Blocked | Fonctionnalité non démarrée                                             |

## 4. Problèmes & Blocages

* **Logique métier incomplète** : services CRUD pas encore complets.
* **Base de données incomplète** : manque de tables pour `User`, `Deck`, `Tournament` (initialisés mais non fonctionnels).
* **Modèles de données** : définir clairement `Tournament`, `User`, `Deck`, etc.

## 5. Démonstrations & Preuves

* `apps/fetch/src/index.ts` : microservice de récupération des cartes Pokémon.
* `apps/api/src/cards/card.model.ts` & `apps/api/src/cards/card.controller.ts` : exemples de modèle et route CRUD.
* `apps/web/pages/index.tsx` : page d’accueil avec carte aléatoire.
* `apps/web/components/SearchBar.tsx` : composant de recherche basique.

## 6. Plan d’action pour le prochain RUN

* Finir la configuration de la base de données.
* Implémenter les CRUD réels pour Tournois, Utilisateurs et Decks.
* Mettre en place l’authentification (inscription, connexion, JWT).
* Priorité : routes et affichage dynamiques pour les tournois.
* Responsables: équipe back-end (API) & équipe front-end (UI).
