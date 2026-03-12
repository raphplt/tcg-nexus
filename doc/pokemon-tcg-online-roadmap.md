# Plan de mise en place du JCC Pokemon en ligne

## Etat verifie du depot

- Le moteur de jeu existe deja dans [`apps/api/src/match/engine/GameEngine.ts`](C:\Users\rapha\Documents\Travail\ETNA\Repository\tcg-nexus\apps\api\src\match\engine\GameEngine.ts).
- Les actions deja implementees sont : poser un Pokemon de base, attacher une Energie, evoluer, battre en retraite, attaquer et finir le tour.
- Le `EffectResolver` supporte aujourd'hui seulement des effets simples : degats, soin, pioche, pile ou face, etat special.
- Le gateway temps reel et le store frontend existent, mais restent des squelettes.
- La page match du web n'affiche pas encore de vrai plateau de jeu.

## Correctif applique pendant cette passe

- Correction du blocage TypeScript dans [`apps/api/src/match/engine/GameEngine.ts`](C:\Users\rapha\Documents\Travail\ETNA\Repository\tcg-nexus\apps\api\src\match\engine\GameEngine.ts) pour pouvoir relancer la build et les tests.
- Verification effectuee :
  - `npm run build` dans `apps/api` : OK
  - `npm test -- match/engine` dans `apps/api` : OK, 12 tests passent

## Regles officielles a respecter en priorite

Source principale : [`asc_rulebook_fr.pdf`](C:\Users\rapha\Downloads\asc_rulebook_fr.pdf)

- Mise en place :
  - deck de 60 cartes
  - pioche initiale de 7 cartes
  - obligation d'avoir au moins 1 Pokemon de base
  - gestion des miseres
  - 1 Pokemon Actif
  - jusqu'a 5 Pokemon de Banc
  - 6 cartes Recompense
- Tour de jeu :
  - 1 pioche au debut du tour
  - actions libres pendant la phase principale
  - 1 attachement d'Energie manuel par tour
  - 1 retraite par tour
  - l'attaque termine le tour
  - le premier joueur ne peut pas attaquer lors de son premier tour
  - le premier joueur ne peut pas jouer de Supporter lors de son premier tour
- Resolution :
  - faiblesse et resistance sur le Pokemon Actif uniquement
  - verification des K.O.
  - prise de cartes Recompense
  - promotion obligatoire d'un nouveau Pokemon Actif
  - Controle Pokemon entre les tours

Source tournoi : [`play-pokemon-tcg-tournament-handbook-fr.pdf`](C:\Users\rapha\Downloads\play-pokemon-tcg-tournament-handbook-fr.pdf)

- En BO3, la personne qui perd une manche choisit qui commence la suivante.
- Les miseres supplementaires donnent des cartes supplementaires a l'adversaire.
- Les matchs de tournoi demandent une gestion propre des temps, des egalites, des forfaits et des informations publiques/privees.

## Ecarts fonctionnels constates

### 1. Setup de partie absent

Le moteur ne gere pas encore la sequence officielle de debut de partie :

- melange du deck
- pioche des 7 cartes
- verification du Pokemon de base
- boucle de misere
- placement cache puis revelation
- tirage des 6 cartes Recompense
- choix du joueur qui commence

### 2. Resolution de combat inachevee

Aujourd'hui, une attaque journalise `ATTACK_USED` puis termine le tour, mais ne resout pas reellement le combat :

- pas d'appel reel au `EffectResolver` depuis l'attaque
- pas de faiblesse / resistance
- pas de verification K.O.
- pas de prise de Recompense
- pas de promotion automatique d'un nouveau Pokemon Actif
- pas de condition de victoire sur cartes Recompense ou absence de Pokemon

### 3. Controle Pokemon non implemente

La methode `pokemonCheckup()` est vide. Les etats speciaux existent dans les types, mais pas dans la vraie boucle de jeu.

### 4. Regles d'evolution encore fragiles

Le moteur bloque l'evolution si `turnsInPlay < 1`, mais ce compteur n'est jamais incremente au changement de tour. En l'etat, l'evolution ne peut pas etre correcte.

### 5. Moteur d'effets trop simple pour un vrai jeu en ligne

Il manque les briques indispensables pour couvrir le vrai JCC Pokemon :

- recherche dans le deck
- choix de cible
- choix de cartes a defausser
- effets persistants jusqu'a la fin du tour ou du prochain tour
- prevention / reduction de degats
- effets "si vous obtenez face"
- capacites passives
- effets de remplacement
- effets sur le Banc
- cartes Dresseur, Outil, Stade, Energie speciale

### 6. Pas de systeme de decisions interactives

Un vrai moteur Pokemon a besoin d'un systeme de "pending prompt" ou "pending decision" pour gerer :

- choix d'une carte dans la main
- choix d'une cible sur le Banc
- choix d'une Energie a defausser
- choix de cartes dans le deck
- resolution de plusieurs effets sequentiels

Sans cette couche, beaucoup de cartes officielles resteront impossibles a jouer proprement.

### 7. Temps reel incomplet

Le gateway existe, mais :

- il ne cree pas encore l'instance `GameEngine`
- il ne recharge pas d'etat depuis la base
- il n'associe pas un socket a un joueur autorise
- il diffuse l'etat brut sans masquer la main et le deck adverses
- il ne persiste pas l'etat ni l'historique des evenements

### 8. Frontend match incomplet

- `GameBoard` est un placeholder visuel
- le store Zustand est encore en `any`
- la page match actuelle affiche seulement les informations de match et le formulaire de score
- il n'y a pas encore de plateau interactif, de main jouable, ni de file d'actions

### 9. Mode tournoi non branche au vrai gameplay

Le modele `Match` gere surtout le suivi de tournoi :

- statut
- scores
- gagnant
- dates

Mais il ne stocke pas encore :

- l'etat de partie serialise
- les decks verrouilles pour le match
- l'historique des tours / evenements
- le numero de manche dans un BO3
- la personne qui choisit de commencer la manche suivante

## Plan recommande

### Phase 1. Stabiliser le domaine de match en ligne

Objectif : avoir un vrai modele de partie persistante.

A faire :

- ajouter un modele persistant de `match game session`
- stocker l'etat serialise du moteur
- stocker les decks choisis et verrouilles pour chaque joueur
- stocker la manche en cours, le score BO3, le joueur qui commence
- stocker un journal d'evenements et un RNG seed pour rejouabilite

Critere de sortie :

- on peut creer une session de partie a partir d'un match de tournoi et de deux decks

### Phase 2. Implementer la mise en place officielle

Objectif : lancer une vraie partie sans intervention manuelle.

A faire :

- creation des instances de cartes depuis les cartes de deck
- melange deterministe
- pioche initiale
- miseres
- placement Actif / Banc
- cartes Recompense
- premier joueur
- interdictions du premier tour

Critere de sortie :

- une partie peut demarrer automatiquement et respecter les regles de setup

### Phase 3. Rendre le moteur conforme pour une manche complete

Objectif : terminer une vraie manche de jeu.

A faire :

- appliquer les degats correctement
- appliquer faiblesse / resistance
- gerer K.O. et promotion
- attribuer les cartes Recompense
- gerer les conditions de victoire
- implementer le Controle Pokemon
- corriger `turnsInPlay`
- ajouter les actions Dresseur et Talents au minimum structurellement

Critere de sortie :

- deux decks simples peuvent jouer une manche complete jusqu'a une victoire legale

### Phase 4. Introduire le systeme de decisions interactives

Objectif : supporter les effets non triviaux sans hacks.

A faire :

- ajouter une pile de prompts a resoudre
- bloquer le tour tant qu'une decision obligatoire n'est pas prise
- formaliser les reponses possibles cote client
- gerer les choix caches et publics

Critere de sortie :

- le moteur peut demander un choix au joueur puis reprendre la resolution proprement

### Phase 5. Mapper les vraies cartes vers le moteur

Objectif : brancher votre base de cartes au moteur.

A faire :

- definir un format intermediaire normalise entre vos entites DB et le moteur
- mapper attaques, capacites, couts, retraites, faiblesses, resistances
- ajouter un pipeline de compatibilite : "carte jouable en ligne" / "non supportee"
- commencer par un sous-ensemble de cartes pour valider la boucle complete

Critere de sortie :

- un deck repondant au sous-ensemble supporte peut etre joue sans traitement manuel

### Phase 6. Brancher le temps reel et la securite

Objectif : rendre la partie jouable a deux.

A faire :

- authentifier les sockets
- verifier que le joueur appartient bien au match
- charger ou creer la session de partie
- diffuser un etat sanitise par joueur
- persister chaque action et chaque evenement
- gerer reconnexion et reprise de partie

Critere de sortie :

- deux joueurs connectes voient chacun leur vue et peuvent reprendre apres deconnexion

### Phase 7. Construire le vrai plateau web

Objectif : jouer depuis l'interface de tournoi.

A faire :

- integrer `GameBoard` dans la page match
- typer le store frontend
- afficher actif, banc, main, deck, defausse, cartes Recompense
- ajouter les actions cliquables ou drag and drop
- afficher les prompts de decision
- journaliser les evenements de partie

Critere de sortie :

- une manche peut etre jouee completement depuis le navigateur

### Phase 8. Integrer le mode tournoi complet

Objectif : faire du online play un composant reel du module tournoi.

A faire :

- lier la session de jeu au match de tournoi
- gerer BO1 / BO3
- choix du premier joueur sur les manches suivantes
- timer de ronde
- fin de round, egalites, forfaits
- remontage automatique du resultat dans le tournoi

Critere de sortie :

- un match de tournoi peut etre joue et termine en ligne sans saisie manuelle du score

## Ordre de priorite concret pour nous

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 6
6. Phase 7
7. Phase 5
8. Phase 8

Pourquoi cet ordre :

- sans persistance et setup officiel, il n'y a pas de vraie partie
- sans moteur conforme de manche, le temps reel ne sert a rien
- sans prompts, les vraies cartes ne passeront pas
- le mapping complet des cartes doit venir apres la stabilisation du moteur

## Definition realiste du premier jalon jouable

Le premier jalon utile n'est pas "toutes les cartes Pokemon existent".  
Le premier jalon utile est :

- une manche BO1 jouable de bout en bout
- avec setup officiel
- avec Pokemon, Energies, retraites, evolutions, attaques et K.O.
- avec cartes Recompense et victoires
- avec un sous-ensemble de cartes officiellement supporte
- avec plateau web jouable a deux
- avec etat persistant et reprise apres refresh

## Risques a traiter tot

- Le modele actuel est trop synchrone pour les effets qui demandent des choix.
- L'etat complet ne doit jamais etre diffuse tel quel a l'adversaire.
- Le moteur doit etre deterministe pour deboguer, rejouer et arbitrer.
- Le tournoi en ligne devra distinguer resultat de manche, resultat de match, et etat live.
- Le support de "toutes les cartes" ne sera pas atteignable proprement sans pipeline de compatibilite et tests de regression par carte.
