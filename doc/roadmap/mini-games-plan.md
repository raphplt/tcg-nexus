# Plan — Remise à niveau des mini-jeux

> Audit du 2026-09-10 sur `main` (6aca7c51). Périmètre : les 5 pages de
> `apps/web/app/[locale]/(main)/pokemon/mini-games/*` et la gateway
> `apps/api/src/mini-game/`. Aucun mini-jeu n'existe côté mobile.

## 0. Avancement

| Lot | Statut | Contenu livré |
|---|---|---|
| Gateway (phase 2, points 1 à 6 et 8) | **Livré** 2026-09-10 | `MiniGameItemsService` (cartes Pokémon avec prix réel, scellés au prix moyen des annonces, libellés localisés par joueur), timer serveur Juste Prix, estimations masquées jusqu'au reveal, matchmaking sur paramètres identiques, grâce de reconnexion 20 s puis forfait, erreur explicite quand le catalogue est vide. 42 tests. |
| Socle web (phase 1, hors passe i18n des autres jeux) | **Livré** 2026-09-10 | `useMiniGameSocket`, `useCountdown`, `utils/miniGames/pricing.ts` (miroir de l'API), composants `MiniGames/*` (en-tête, cartes de mode, salon en ligne, résultat, erreur, avis de déconnexion). |
| Juste Prix (phase 3) | **Livré** 2026-09-10 | Page réécrite en composants, items via `GET /mini-game/juste-prix/items` (1 appel, prix réels, plancher 1 € pour les cartes), reveal qui ne s'efface plus, plus d'`alert`, saisie décimale validée, i18n complète FR/EN, choix du nombre de manches. Tests : reducers solo/local, hook socket, parcours solo complet. |
| Persistance des scores (phase 2, point 7) | À faire | Prévu avec le lot Case Opening. |
| Case Opening, Who's That Pokémon, Pokedle, Hub, Smash or Pass | À faire | — |

## 1. Constat global

Les cinq jeux ont été écrits chacun dans leur coin, en un seul fichier par jeu
(450 à 1 300 lignes), avec la logique de jeu, la gestion socket et l'UI
mélangées. Les défauts transverses pèsent plus lourd que les défauts propres à
chaque jeu :

| # | Défaut transverse | Impact |
|---|---|---|
| T1 | **i18n à moitié faite** : ~80 chaînes françaises en dur au milieu des `t()` (« Quitter », « Rejouer », « Moi », « PikaBot », « Manche X », « Deviner », « Temps écoulé ! », « Matchmaking en ligne », etc.). Le hub type même ses modes avec le littéral `"En ligne"`. | Un utilisateur EN voit une UI bilingue. |
| T2 | **Données factices en production** : `fallbackPool`, « Dracaufeu 45 € », « Pikachu / Célébrations », cartes mock avec image `pokemontcg.io`, prix scellés constants. Servies silencieusement dès qu'un appel échoue ou qu'une donnée manque. | Le joueur joue avec de faux prix / fausses cartes sans le savoir. |
| T3 | **Zéro test web** sur les 5 pages. La gateway n'a que des happy paths. | Chaque fix est à l'aveugle. |
| T4 | **Aucune persistance** : pas de score, pas d'historique, pas de classement, aucun lien avec les modules `challenge` / `badge` / `ranking` qui existent déjà côté API. | Aucune raison de rejouer. |
| T5 | **Code dupliqué** : extraction de prix écrite 3 fois (2 côté web, 1 côté API, avec des fallbacks différents : 0,5 € / aléatoire 2-22 € / 1 €), `getGeneration` écrit 2 fois, connexion socket + matchmaking recopiés dans 2 pages, `any` partout. | Corrections à faire en plusieurs endroits, dérive inévitable. |
| T6 | **Utilisateur anonyme en ligne** : la gateway coupe la socket sans message, le client reste sur « Connexion… » à l'infini. | Mode en ligne inutilisable sans explication. |

## 2. Défauts par jeu

### 2.1 Gateway `/mini-game` (porte les modes en ligne de Case Opening et Juste Prix)

| Sévérité | Défaut | Où |
|---|---|---|
| **Bloquant** | Les cartes tirées côté serveur n'ont **ni nom, ni image, ni rareté** : `name`/`image`/`rarity` sont des champs virtuels résolus par `CatalogLocalizationInterceptor` (HTTP seulement). La gateway ne joint pas les traductions et n'appelle pas `resolveLabels`. Le client retombe sur « Carte Pokémon » + dos de carte. En Juste Prix en ligne, on estime le prix d'une carte invisible. | `mini-game.gateway.ts` `drawRandomCards`, `generateGameItems` |
| Haute | Pas de filtre `game = POKEMON` : des cartes Magic / Lorcana / Yu-Gi-Oh peuvent sortir dans un jeu Pokémon. | idem |
| Haute | Prix des scellés inventés : `mockPrice` ou constantes 150 / 55 / 6 / 25 € selon `productType`. Un display vaut toujours 150 €. Le solo utilise, lui, `getStatistics` (moyenne des annonces). Deux vérités. | `getItemPrice` |
| Haute | Cartes sans prix : `card.pricing IS NOT NULL` ne vérifie que la colonne, pas son contenu → prix « correct » à 1 €. | `getCardMarketValue` |
| Haute | **Fuite des estimations** : `formatSessionState` renvoie `guesses` des deux joueurs à chaque `minigame_state_update`, y compris la manche en cours → l'adversaire voit ton estimation et tes points avant le reveal. | `formatSessionState` |
| Haute | Pas de timer serveur en Juste Prix : si un joueur ne répond jamais, l'autre attend indéfiniment. Le bonus vitesse suppose 15 s en dur. | `handleSubmitGuess` |
| Moyenne | Paramètres de matchmaking : la session prend `roundCount`/`setId` du **second** joueur, le choix du premier est ignoré. | `handleJoinQueue` |
| Moyenne | Déconnexion : suppression immédiate de toute session du joueur (pas de grâce de reconnexion alors que `join_room` sait déjà mettre à jour le `socketId`), pas de notion de forfait / vainqueur. | `handleDisconnect` |
| Moyenne | File d'attente et sessions en mémoire : perdues au redémarrage, incompatibles multi-instance. `minigame_queue_status` broadcasté à tout le namespace. | — |
| Basse | Scoring Juste Prix : `1000 − écart% × 10000` → 0 point au-delà de 10 % d'écart, impossible sur une carte à 0,20 €. | `handleSubmitGuess` |
| Basse | Tests : pas de déconnexion en cours de partie, pas de mismatch de paramètres, pas de localisation. | `mini-game.gateway.spec.ts` |

### 2.2 Juste Prix

| Sévérité | Défaut |
|---|---|
| **Bloquant (en ligne)** | Le serveur émet `minigame_round_reveal` **puis** `minigame_state_update`. Le client, sur `state_update` avec `state === "playing"`, fait `setOnlineReveal(null)` → le reveal est effacé dans le même tick. L'UI reste sur « Estimation envoyée », le bouton « Prêt » n'apparaît jamais : **partie bloquée à la fin de la manche 1**. À confirmer à deux navigateurs. |
| Bloquant (en ligne) | Item sans nom ni image (cf. gateway). |
| Haute | Prix « correct » **aléatoire** (`Math.random()*20+2`) quand la carte n'a pas de pricing. Le jeu ment au joueur. |
| Haute | Démarrage solo : jusqu'à 33 appels `getRandom` séquentiels + `sealedProductService.getAll()` (tout le catalogue scellé) + 2 `getStatistics`. Plusieurs secondes avant la première manche. |
| Moyenne | `alert()` bloquant à la déconnexion de l'adversaire. |
| Moyenne | Timer en ligne purement client : l'effet dépend de l'objet `onlineSession` entier, donc chaque `state_update` replanifie le tick → compte à rebours qui saccade. Timeout = estimation `0` envoyée silencieusement. |
| Moyenne | Local : `Input type="password" pattern="[0-9]*"` → virgule décimale impossible sur certains claviers mobiles. `localGuessesCount` inutilisé, `p1Guess!` partout. |
| Basse | Indice plus/moins avec tolérance ±0,10 € alors que la victoire est à ±10 % : incohérent sur petits prix. |

### 2.3 Case Opening

| Sévérité | Défaut |
|---|---|
| Bloquant (en ligne) | Cartes sans nom ni image (cf. gateway). |
| Haute | Pool solo/local = `getPaginated({limit: 80})` **page 1, tri par défaut** : ce ne sont pas 80 cartes aléatoires mais toujours les 80 premières du set (ou de toute la base pour « Toutes »). Les boosters se ressemblent tous. |
| Haute | Un « booster » = 6 tirages uniformes dans ce pool, doublons permis, aucune pondération par rareté. Ça ne ressemble pas à un booster. |
| Moyenne | Roulette : 43 `<img loading="eager">` par carte × 6 cartes = ~260 images chargées par booster, en qualité `high`. Lourd sur mobile. |
| Moyenne | Mode local « passe l'appareil » : il n'y a aucune information cachée (pure chance), l'étape de handoff n'ajoute que de la friction. |
| Moyenne | « Duel Ordinateur » / « PikaBot » : aucun bot, juste un second tirage. Nommage trompeur. |
| Basse | 12 `useRef` miroirs d'état + 20 `useState` : c'est une machine à états qui devrait être un reducer. |

### 2.4 Pokedle

| Sévérité | Défaut |
|---|---|
| Haute | **La cible est une carte, pas un Pokémon**. HP / stade / rareté décrivent une impression précise parmi des centaines. Le joueur qui tape « Pikachu » voit jusqu'à 8 « Pikachu » de sets différents (aucune dédoublonnage), choisit au hasard, gagne sur le nom mais lit des indices HP/rareté contradictoires. |
| Haute | **L'image révèle la réponse** : flou 30 px → 0 px par pas de 6 ; à l'essai 5 l'image est nette (« Net ! ») alors que la partie continue. Le nom est imprimé sur la carte : lisible dès un flou moyen. |
| Haute | Pas de mode quotidien, pas de seed, pas de partage de résultat, pas de streak : tout ce qui fait un « -dle ». |
| Moyenne | `search` sans limite serveur : renvoie toutes les cartes correspondantes, le client garde 8. |
| Moyenne | Fallbacks `|| "Basic"` / `|| "Common"` → faux « vert » quand la donnée manque. Rareté comparée sur libellé localisé. |
| Moyenne | Dropdown : pas de navigation clavier, ne se ferme jamais au clic extérieur, même carte proposable deux fois, pas d'état de chargement. |
| Basse | Aucune légende pour ⬆️ / ⬇️. « Aucun », « HP », « Essai », « Flou », « Mystère » en dur. |

### 2.5 Who's That Pokémon

| Sévérité | Défaut |
|---|---|
| Haute | Pool de leurres = `getPaginated({limit: 120})` page 1 → toujours les mêmes ~120 noms, souvent d'un seul set. Complété par `POPULAR_POKEMON`, **liste de noms français en dur** : en EN, la bonne réponse est le seul nom anglais parmi des leurres français. |
| Haute | Le nom est imprimé sur la carte ; en « facile » le flou descend à 3 px : lisible. Pas de silhouette, pas de recadrage sur l'illustration. |
| Moyenne | Même Pokémon cible possible plusieurs fois dans une partie de 10 manches. |
| Moyenne | Carte fallback « Dracaufeu / Feu / Célébrations » avec image placeholder si l'API échoue : on demande de deviner un dos de carte. |
| Moyenne | Indice « Type : … » affiche la valeur brute de `types` : à vérifier que la langue correspond à la locale. |
| Basse | `shuffle` via `sort(() => 0.5 - Math.random())` (biaisé), `key={option}` fragile aux doublons, timer replanifié à chaque changement de `handleAnswer`. |
| Basse | Score / meilleure série perdus à la fermeture. |

### 2.6 Smash or Pass

| Sévérité | Défaut |
|---|---|
| Haute | **Ce n'est pas un jeu** : un swipe droit = `addToWishlist` (erreur seulement en console), pas de fin de session, pas de bilan, pas d'annulation. C'est une fonctionnalité de découverte de collection déguisée en mini-jeu (la page collection y renvoie d'ailleurs directement). |
| Moyenne | Un aller-retour API + `wait(400)` par swipe, aucune préchargement : latence visible à chaque carte. |
| Moyenne | Tirage sans exclure les cartes déjà dans la wishlist / collection → redites. `toast.error` à **chaque** swipe droit anonyme. |
| Moyenne | Raccourcis clavier actifs même quand le dialogue de filtres est ouvert. |
| Moyenne | 5 fonds 4K en `priority` ; layout `h-[calc(100vh-3.5rem)] overflow-hidden` qui coupe carte + boutons sur petit écran dès que filtres et stats s'affichent. |
| Basse | Libellés filtres inversés (« Bloc » = serie, « Série » = set). `PokemonRarity` = libellés français en dur côté web. |

### 2.7 Hub

- Modes en dur par jeu, `featureCount` + clés `feature1..3` : pattern fragile.
- Rien n'indique que le mode en ligne exige une connexion, ni aucun score / record personnel.

## 3. Décisions à prendre avant de coder (phase 0)

1. **Smash or Pass** : le reclasser en « Découverte » hors hub mini-jeux (recommandé), ou lui donner une vraie boucle (session de 20 cartes, bilan, undo). Le plan ci-dessous suppose le reclassement.
2. **Mode en ligne** : le garder uniquement pour Juste Prix et Case Opening, une fois la gateway corrigée, en acceptant la contrainte mono-instance (documentée) plutôt que d'ajouter Redis maintenant.
3. **Persistance** : oui, via une entité `MiniGameResult` branchée sur `challenge` / `badge` / `ranking`. C'est ce qui donne une raison de rejouer.
4. **Mobile** : hors périmètre de ce plan. Noté en phase 5 optionnelle.

## 4. Plan

### Phase 1 — Fondations web partagées (taille M)

Objectif : un socle commun avant de toucher aux jeux, sinon chaque fix se fait 5 fois.

- Créer `apps/web/components/MiniGames/` : `GameShell` (en-tête, retour, badges de score, quitter), `ModeSelect`, `ResultPanel`, `CountdownBadge`.
- Hook `useMiniGameSocket(gameType)` : connexion, **état « non connecté : connecte-toi »** (T6), file d'attente, match, état de session, reveal, déconnexion adverse (sans `alert`). Utilisé par Juste Prix et Case Opening.
- `utils/miniGames/` : `cardMarketValue(card): number | null` (une seule implémentation, **null** au lieu d'un faux prix), `pokemonGeneration(dexId)`, `shuffle` (Fisher-Yates), scoring Juste Prix partagé avec le serveur (même formule).
- Supprimer tous les fallbacks à données factices → état d'erreur explicite + « Réessayer ».
- Passe i18n : extraire les ~80 chaînes en dur dans les 6 namespaces FR/EN existants. Ajouter `react/jsx-no-literals` en `error` sur le dossier `mini-games` pour que ça ne revienne pas.
- Tests : Vitest/RTL sur les fonctions pures extraites et sur le hook socket avec une socket mockée.

### Phase 2 — Gateway API (taille L)

Ordre par sévérité.

1. **Libellés** : injecter `CatalogLocalizationService`, résoudre `name`/`image`/`rarity` sur toute carte émise (locale lue dans le handshake, défaut `fr`). Ajouter `game = POKEMON` et, pour Case Opening, `pokemonDetails.category = 'Pokemon'` en option.
2. **Prix** : exclure les cartes sans prix exploitable (plus de 1 € par défaut) ; scellés via `SealedProductService.getStatistics` ou une colonne de prix de référence, exclure ceux sans prix. Une seule fonction `getItemPrice` côté API, exposée aussi en REST pour le solo (voir phase 3).
3. **Anti-triche** : `formatSessionState` ne renvoie plus `guesses` ; seulement `hasGuessed` et le score des manches closes. Les estimations ne sortent que dans `minigame_round_reveal`.
4. **Timer serveur** Juste Prix : `roundDurationMs` + `roundStartedAt` dans l'état ; `setTimeout` serveur qui clôt la manche (estimation manquante = 0 point) et émet le reveal. Le client ne fait qu'afficher le décompte à partir de `roundStartedAt`.
5. **Matchmaking** : n'apparier que des paramètres compatibles (`roundCount` égal, `setId` égal ou absent des deux côtés), sinon rester en file.
6. **Déconnexion** : grâce de 30 s (la reconnexion via `join_room` existe déjà), puis forfait avec `winnerId` émis et session passée en `finished`. Ne supprimer que les sessions du joueur parti.
7. **Persistance** : entité `MiniGameResult` (`userId`, `gameType`, `mode`, `score`, `opponentId?`, `won?`, `meta` JSON, `createdAt`) ; écriture automatique à la fin d'une session en ligne ; `POST /mini-game/results` pour le solo ; `GET /mini-game/me/history`, `GET /mini-game/leaderboard/:gameType`. Déclencheurs `challenge` / `badge` (« gagne 3 duels en ligne », « 5 Pokedle d'affilée »).
8. Tests : déconnexion en cours de partie, mismatch de paramètres, ordre reveal/état, expiration du timer, libellés résolus, pas de fuite des estimations.

### Phase 3 — Corrections par jeu (ordre recommandé)

**Juste Prix (M)**
- Corriger l'effacement du reveal : ne vider `onlineReveal` que quand `round` change (déjà le rôle du premier effet), jamais sur un simple `state_update`.
- Endpoint REST `GET /mini-game/juste-prix/items?count=5` réutilisant le générateur de la gateway (items **avec** prix de référence, le solo n'a pas d'enjeu de triche) → 1 appel au lieu de ~35, plus de prix aléatoire, même source que le mode en ligne.
- Tolérance de victoire : `max(10 %, 0,20 €)` pour les petits prix ; même formule solo / en ligne.
- Input local : `type="text" inputMode="decimal"` masqué par CSS plutôt que `type="password"`.

**Case Opening (M)**
- Endpoint `GET /mini-game/case-opening/packs?setId&count` qui tire côté serveur avec une **composition par rareté** (ex. 4 commune/peu commune, 1 rare+, 1 reverse) et sans doublon dans le booster. Même logique pour le mode en ligne.
- Roulette : bande réduite à ~25 cartes, images `getCardImage(card, "low")`, `loading="lazy"` hors fenêtre.
- Supprimer l'étape handoff en local (aucune information cachée) ; renommer « Duel Ordinateur » en « Solo » et retirer « PikaBot ».
- Remplacer les refs miroirs par un `useReducer` de la machine `idle → spinning → finished`.

**Pokedle (L)**
- La cible devient une **espèce** : tirer un `dexId`, comparer types / génération / stade / PV de la **carte de référence** et afficher son set pour que les indices aient un sens. Recherche dédoublonnée par nom (un résultat par espèce), `?limit=20` côté serveur.
- Image : masquée jusqu'à la fin (ou flou minimal 14 px jamais abaissé). Le flou comme récompense de progression se fait sur l'illustration recadrée (`object-position` sur la zone d'art), jamais sur le nom imprimé.
- Mode **quotidien** : seed = date, même cible pour tout le monde, chaîne de partage type `🟩🟨⬜`, streak persistée via `MiniGameResult`. Mode « libre » en second onglet.
- Dropdown : navigation clavier, fermeture au clic extérieur, pas de doublon de proposition, état de chargement ; légende des flèches.

**Who's That Pokémon (M)**
- Leurres tirés côté serveur : `GET /pokemon-card/species/random?count=40` (une entrée par `dexId`, catégorie Pokémon, noms **localisés**). Supprimer `POPULAR_POKEMON`.
- Exclure les cibles déjà vues dans la partie.
- Masque : recadrage sur l'illustration + `brightness(0.05)` façon silhouette en « difficile », flou sur l'illustration seule en « facile/moyen ». Le nom imprimé ne doit jamais être dans la zone visible.
- Vérifier la langue de `types` pour l'indice ; Fisher-Yates ; score envoyé à `POST /mini-game/results`.

**Smash or Pass (S, si reclassé)**
- Sortir du hub, le laisser accessible depuis la collection sous « Découverte ».
- Préchargement de 3 cartes, exclusion des cartes déjà en wishlist / collection, un seul toast anonyme par session, raccourcis clavier désactivés quand le dialogue est ouvert, fonds en WebP avec `sizes`, layout scrollable sous 700 px.

**Hub (S)**
- Modes depuis un enum typé, badge « Connexion requise » sur le mode en ligne, record personnel / dernière partie depuis `GET /mini-game/me/history`.

### Phase 4 — Qualité continue (S)

- Un test E2E à deux clients (Playwright, 2 contextes) par jeu en ligne : match → manches → fin → déconnexion.
- Budget perf : Lighthouse mobile sur chaque page de jeu, pas d'image `priority` hors carte courante.

### Phase 5 — Optionnel

- Redis adapter socket.io si déploiement multi-instance.
- Portage mobile de Who's That Pokémon et Pokedle une fois la logique extraite en fonctions pures (candidat à un paquet `packages/mini-games-core`).

## 5. Ordre d'exécution proposé

1. Phase 0 (décisions, 1 réunion).
2. Phase 2 points 1 à 4 (gateway : libellés, prix, anti-triche, timer) **et** Phase 3 Juste Prix point 1 (reveal effacé) : ce sont les bloquants du mode en ligne.
3. Phase 1 (socle web + i18n + suppression des fallbacks).
4. Phase 3 : Juste Prix → Case Opening → Who's That Pokémon → Pokedle → Hub → Smash or Pass.
5. Phase 2 points 5 à 8 (matchmaking, déconnexion, persistance, tests).
6. Phase 4.
