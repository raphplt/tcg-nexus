# Roadmap TCG Nexus — outillage du board GitHub Projects

Ce dossier contient de quoi alimenter et maintenir la roadmap vivante du projet,
dont le lien est communiqué dans `etape2.pdf` (CMG-MGQ5 · Étape 2, dépôt de rendu
ETNA).

| Fichier | Contenu |
| --- | --- |
| `roadmap-tcg-nexus.csv` | Les 154 items du backlog, avec épic, statut, priorité, version, horizon, catégorie technique, responsable et date butoir. |
| `setup_board.py` | Amorçage du board : crée les champs personnalisés et importe les items du CSV. |

> Ces fichiers doivent rester **suivis par git**. Non versionnés, un `git clean -fd`
> les efface sans prévenir.

## 1. Champs personnalisés du board

Board cible : `github.com/users/raphplt/projects/3`

| Champ | Type | Valeurs |
| --- | --- | --- |
| `Epic` | Single select | CAT, COL, MKT, TRN, GME, IA, COM, MOB, SEC, QUA |
| `Version` | Single select | V0.1 → V0.6, V1.0, V1.1, V2.0, V2.5 |
| `Horizon` | Single select | Shipped, Now, Next, Later, Backlog |
| `Tech category` | Single select | Back-end, Front-end, Mobile, Infra, QA, Data, Full-stack |
| `Priority` | Single select | P0, P1, P2, P3 |
| `Due date` | Date | — |
| `Estimate` | Number | jours-homme |
| `Public` | Single select | true, false |

## 2. Vues à configurer

**Vues internes**

- **Roadmap** — layout *Roadmap*, groupé par `Epic`, dates issues de `Due date`. C'est l'équivalent interactif du Gantt de la partie 4.2 du PDF.
- **Par épic** — layout *Board*, colonnes = `Epic`, filtre `Horizon: Now, Next`.
- **Par développeur** — layout *Table*, groupé par `Assignees`, filtre `Horizon: Now`. Sert au contrôle de capacité en début de cycle.
- **Cycle courant** — layout *Board*, colonnes = `Status`, filtre `Horizon: Now`. C'est le board d'exécution quotidien (à ne pas confondre avec la roadmap).

**Vue publique**

- **Public roadmap** — layout *Board*, colonnes = `Horizon` (Now / Next / Later), filtre `Public: true` **et** `Horizon != Shipped`, champs `Tech category`, `Assignees`, `Due date`, `Estimate` **masqués**.

> Règle de cohérence : le document public est une projection du document interne. Aucune carte ne doit apparaître en vue publique sans exister en interne, et toute promesse du plan de livraison doit être traçable jusqu'à au moins une carte.

## 3. Amorçage du board

GitHub Projects n'expose pas d'import CSV natif. Le script `setup_board.py` fait le
travail via l'API : il crée les champs personnalisés listés ci-dessus, importe chaque
ligne du CSV en draft issue et renseigne ses champs.

```bash
gh auth login
gh auth refresh -s project,read:project

# 1. Inventaire du board + validation du CSV — n'écrit rien
python3 setup_board.py --project 3 --check

# 2. Exécution
python3 setup_board.py --project 3
```

### Ce que le script ne fait jamais

Il ne supprime aucun item, ne modifie aucune vue, et ne touche à aucune carte dont
le titre ne correspond pas exactement à `[ID] Titre` du CSV. Un board contenant déjà
des issues liées au dépôt les conserve intactes.

Le seul effet de bord possible est le **doublon** : si une carte existante décrit le
même travail sous un autre titre, l'import en créera une seconde à côté. `--check`
liste les cartes étrangères au CSV pour permettre de le vérifier avant d'écrire. Pour
réutiliser une carte existante plutôt que d'en créer une nouvelle, il suffit de la
renommer avec le titre exact du CSV.

### Rattacher les issues existantes au backlog

Le board contient déjà des issues qui décrivent le même travail que des items du
backlog, sous un autre libellé — « Copier un deck existant » pour `COL-09`, « Export
de deck au format PDF/Image » pour `COL-11`. Les importer en brouillon créerait des
doublons. Deux modes permettent de rattacher les unes aux autres.

```bash
# 1. Proposer un rapprochement — n'écrit que le fichier local
python3 setup_board.py --project 3 --map

# 2. Relire et corriger mapping-issues.csv, puis appliquer
python3 setup_board.py --project 3 --apply-map --dry-run
python3 setup_board.py --project 3 --apply-map
```

`--map` compare chaque issue du board à chaque item du backlog (ressemblance
littérale pondérée par le recouvrement de vocabulaire) et écrit `mapping-issues.csv`
avec, pour chaque issue, l'item le plus probable, un score et le deuxième candidat.
**Le rapprochement automatique dégrossit, il ne décide pas** : il faut relire le
fichier et corriger la colonne `ID`. La vider signifie « ne rattache pas cette
issue ».

`--apply-map` valide d'abord le fichier — identifiant inconnu, ou même identifiant
attribué à deux issues : il s'arrête sans rien écrire. Puis il pose les champs de la
roadmap sur les issues rattachées, **supprime les brouillons devenus redondants** et
crée en brouillon les seuls items du backlog qui n'ont pas d'issue correspondante.

> La suppression ne porte **que** sur des cartes de type `DraftIssue` dont le titre
> est exactement `[ID] Titre`. Une issue liée au dépôt n'est jamais supprimée, même
> si elle porte ce titre.

### Validation préalable

Le script vérifie que **chaque valeur du CSV a une option correspondante** sur le
board avant d'écrire quoi que ce soit. S'il en manque une, il s'arrête et affiche
exactement quoi ajouter — plutôt que d'échouer au bout de vingt minutes d'import.
L'API GitHub ne sait pas ajouter une option à un champ existant : il faut le faire
dans l'interface (⋯ à droite du nom du champ → *Edit* → *Add option*).
`--skip-missing-options` permet de passer outre en laissant les valeurs concernées
vides.

### Performance et robustesse

L'écriture se fait **par lots de 20 mutations GraphQL** : 49 appels API pour les 154
cartes et leurs 815 valeurs de champ, au lieu de près d'un millier d'appels
`gh project item-edit`. Les erreurs transitoires (429, 499, 502, 503) sont réessayées
avec temporisation croissante, et un lot en échec est rejoué mutation par mutation
pour isoler la carte fautive sans perdre les autres.

Le script est idempotent : les items déjà présents sont retrouvés par leur titre et
leurs champs réappliqués. On peut le relancer autant de fois que nécessaire, y
compris après une interruption en cours de route.

Si le projet n'existe pas encore :

```bash
gh project create --owner @me --title "Roadmap TCG Nexus"
```

**Deux actions restent manuelles**, l'API GitHub ne les couvrant pas :

1. **Créer les cinq vues** décrites à la section 2, depuis l'interface du board.
2. **Passer le projet en visibilité publique** — *Settings → Manage access →
   Visibility → Public* — sans quoi le lien du plan de livraison est inaccessible
   à un lecteur externe.

Les items livrés (`Status: Done`) sont importés en draft issues plutôt qu'en issues
GitHub : ils documentent l'historique de la roadmap sans polluer le tracker du dépôt.
Le CSV reste par ailleurs directement importable dans Trello, Notion, Airtable ou
Linear si l'équipe souhaite un second support de visualisation.

## 4. Rythme de mise à jour

| Rituel | Fréquence | Animé par | Objet |
| --- | --- | --- | --- |
| Point de synchronisation | Hebdomadaire | Hugo PERON | Avancement des cartes `Now`, levée des blocages, nettoyage des branches obsolètes (max. 1–2 branches actives par développeur). |
| Revue de cycle | Toutes les 4 semaines | Raphaël PLASSART | Bilan, arbitrage du carry-over, réestimation de la capacité, ajout des idées émergentes. |
| Rétrospective | Toutes les 4 semaines | Tournante | Une seule action d'amélioration engagée par cycle. |
| Revue trimestrielle | Trimestrielle | Équipe complète | Repositionnement des jalons, mise à jour de la vue publique. |
| Campagne de pesée LBC | Trimestrielle | Raphaël PLASSART | Renotation du backlog selon la méthode LBC (cf. étape 3), puis report des arbitrages sur le board. |

Les cartes de l'horizon `Now` se ferment automatiquement à la fusion des pull requests via les mots-clés de fermeture (`Closes #123`) — la mise à jour est donc continue et ne dépend d'aucune saisie manuelle.
