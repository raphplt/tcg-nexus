---
title: Mini-jeux
---

TCG Nexus propose un ensemble de mini-jeux ludiques et éducatifs exploitant directement les données du catalogue et les cotes réelles du marché. Ils sont jouables en mode **Solo**, en mode **Local** (à deux joueurs sur le même écran) ou en mode **Duel en ligne** temps réel via WebSocket.

---

## 1. Jeux disponibles

| Mini-jeu | Description | Moteur & Données |
|---|---|---|
| **Le Juste Prix** (*Guess the Price*) | Deviner la cote marchande exacte d'une carte ou d'un produit scellé dans le temps imparti. | Cartes avec cotes CardMarket/TCGPlayer et produits scellés avec annonces actives. |
| **Case Opening** (*Duel de Boosters*) | Ouvrir des boosters virtuels selon les taux de drop récents et cumuler la plus forte valeur marchande. | Simulateur de tirage par rareté (`booster.ts`) et valorisation en temps réel. |
| **Pokédle** | Deviner le Pokémon mystère façon Wordle selon ses caractéristiques (génération, types, taille, poids). | Module web autonome (`apps/web`). |
| **Who's that Pokémon?** | Reconnaître le Pokémon d'après sa silhouette ombrée. | Module web autonome (`apps/web`). |
| **Smash or Pass** | Sélection rapide de cartes préférées pour alimenter les tendances de popularité. | Module web autonome (`apps/web`). |

---

## 2. Le Juste Prix (`/mini-game/juste-prix`)

### Règles et calcul des points
Le moteur de calcul (`apps/api/src/mini-game/mini-game-pricing.ts`) applique les règles suivantes à chaque manche :

- **Durée de manche** : 15 secondes (`JUSTE_PRIX_ROUND_SECONDS`).
- **Score de précision** : jusqu'à 1 000 points (`JUSTE_PRIX_MAX_ACCURACY_POINTS`), calculé exponentiellement en fonction de l'erreur relative par rapport au prix de référence réel :
  - Prix exact : 1 000 points ;
  - Erreur inférieure à 5% : ~900 points ;
  - Au-delà de 100% d'écart : 0 point de précision.
- **Bonus de rapidité** : jusqu'à 500 points (`JUSTE_PRIX_MAX_SPEED_BONUS`), proportionnel au temps restant au moment de la validation de la réponse.

### Endpoint REST (Solo & Local)
- `GET /mini-game/juste-prix/items` (Public)
  - Paramètres : `count` (nombre d'items, défaut 5), `setId` (filtrer sur une extension précise).
  - Retourne la liste des cartes ou produits scellés aléatoires avec leurs prix de référence en euros et leurs métadonnées traduites dans la langue demandée.

---

## 3. Case Opening & Duel de Boosters (`/mini-game/case-opening`)

### Simulateur de boosters (`booster.ts`)
Le moteur reproduit fidèlement la composition des paquets de cartes physiques selon les standards officiels :

- **Composition de pack** (`PACK_COMPOSITIONS`) :
  - Style `standard` (10 cartes) : 4 Communes, 3 Peu Communes, 1 Reverse Holo garantie, 1 Rare ou supérieure (Rare, Double Rare, Illustration Rare, Spéciale Illustration Rare, Hyper Rare), 1 Énergie de base.
  - Style `vintage` (11 cartes) : 7 Communes, 3 Peu Communes, 1 Rare classique.
  - Style `god_pack` : sélection exclusive de cartes Ultra Rares et Secrètes.
- **Tirage et pondération** : les cartes sont piochées dynamiquement dans le catalogue de l'extension sélectionnée selon leurs raretés respectives.
- **Calcul du vainqueur** : à l'ouverture, chaque carte affiche sa cote marchande en euros. Le joueur dont la valeur cumulée du booster est la plus élevée remporte la manche.

### Endpoint REST (Solo & Local)
- `GET /mini-game/case-opening/packs` (Public)
  - Paramètres : `count` (nombre de manches/boosters), `players` (nombre de participants), `setId` ou `serieId` optionnels, `style` (`standard`, `vintage`).
  - Retourne les grilles de cartes avec prix pour chaque manche et chaque joueur.

---

## 4. Duels en ligne temps réel (`MiniGameGateway`)

Pour les parties multijoueurs à distance, l'API propose une passerelle WebSocket Socket.IO sur le namespace `/mini-game` :

### Cycle de vie d'un duel
1. **Création d'un salon** : le joueur hôte émet `create_duel` en choisissant le type de jeu (`juste-prix` ou `case-opening`), le format et le nombre de manches. Il reçoit un code de salon à 6 caractères.
2. **Rejoindre un duel** : le second joueur émet `join_duel` avec le code du salon.
3. **Synchronisation des manches** : le serveur distribue les items/boosters simultanément aux deux joueurs (`start_round`) et lance le chronomètre officiel.
4. **Validation des réponses** : chaque joueur soumet son estimation ou valide son ouverture (`submit_guess`, `open_pack`).
5. **Résultat de manche & Scoreboard** : le serveur révèle les réponses, calcule les points et diffuse l'état actualisé (`round_result`).
6. **Fin de partie & Revanche** : proclamation du vainqueur final et possibilité d'enchaîner une revanche (`request_rematch`).

### Résilience et gestion des déconnexions
- En cas de perte de connexion réseau d'un participant, un timer de grâce de 30 secondes est accordé avant de prononcer le forfait automatique.
