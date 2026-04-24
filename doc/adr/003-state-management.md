# ADR-003 — Séparation server state (React Query) / client state (Zustand) / contexte (React Context)

- **Statut** : Accepté
- **Date** : 2024
- **Auteurs** : équipe TCG Nexus

## Contexte

Le frontend Next.js manipule plusieurs natures d'état très différentes :

- **Données distantes** issues de l'API — cartes Pokémon, listings marketplace, tournois, decks. Ces données sont paginées, triables, filtrables, peuvent être rafraîchies, et doivent être mises en cache pour ne pas hammerer l'API.
- **État client global** — contenu du panier, devise préférée de l'utilisateur, état d'une partie en cours. Cet état n'appartient qu'au client (ou est synchronisé ponctuellement avec le serveur).
- **État applicatif transverse** — utilisateur connecté, thème clair/sombre. Lu par beaucoup de composants, rarement modifié.

Utiliser un seul outil pour ces trois natures conduit à des compromis (Redux tout-en-un fonctionne mais gonfle le code, Context API tout-en-un explose en re-renders).

## Décision

Chaque nature d'état est confiée à l'outil le plus adapté :

| Nature | Outil | Exemple |
|---|---|---|
| Server state | `@tanstack/react-query` v5 | Liste des cartes Pokémon paginées, listings marketplace, détail d'un tournoi |
| Client state global | `zustand` v5 | `cart`, `currency`, `matchState` |
| Contexte applicatif | React `Context` | `AuthContext`, `ThemeContext` |

**Règles d'usage** :

- Toute donnée qui vient de l'API passe par React Query. Les composants ne font jamais d'appel Axios direct ; ils utilisent un `service` via un `useQuery` ou un `useMutation`.
- Le panier est une donnée de domaine synchronisée avec l'API (`UserCart`) ; côté client il est manipulé via un store Zustand dédié, les mutations persistent via React Query.
- `AuthContext` expose `user`, `isLoading`, `login`, `logout`, `register`. L'utilisateur est lui-même récupéré via React Query derrière le provider, mais l'API publique du context est le Context.
- Pas de `useState` dans un composant pour des données distantes.

## Alternatives considérées

### Redux Toolkit + RTK Query

- **+** Une seule bibliothèque pour tout, outils de devtools excellents.
- **−** Code plus verbeux (slices, reducers, selectors) pour l'échelle actuelle du projet.
- **−** RTK Query est très capable mais moins naturel qu'une approche hook-first React Query pour des pages Next.js App Router.

### Uniquement React Context

- **+** Zéro dépendance supplémentaire.
- **−** Re-renders massifs dès qu'on met de la donnée dynamique dans le context (tout consommateur se re-render à chaque changement).
- **−** Pas de cache / invalidation / retry / dedup — tout devrait être recodé.

### Jotai / Recoil

- Alternatives valables à Zustand. Zustand a été retenu pour son API minimaliste (création d'un store = une fonction, pas de provider nécessaire) et sa maturité.

## Conséquences

### Positives

- Chaque donnée est au bon endroit, le code est plus lisible.
- React Query apporte gratuitement : cache, stale-while-revalidate, retry, dedup des requêtes concurrentes, pagination et infinite scroll.
- Zustand est suffisamment léger pour n'avoir aucun coût perçu.
- Les responsabilités sont claires — on ne débat plus « où mettre ça ».

### Négatives / à surveiller

- Un nouveau contributeur doit intégrer trois outils au lieu d'un. C'est couvert par ce document et des exemples dans le code.
- Il faut résister à la tentation de dupliquer une donnée serveur dans Zustand pour « l'avoir sous la main ». Règle : si c'est server state, c'est React Query, point.
- Lorsqu'une mutation côté client doit synchroniser plusieurs queries React Query, il faut penser à invalider correctement (`queryClient.invalidateQueries`). À tester dans les futurs tests d'intégration.
