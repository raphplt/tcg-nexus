# Glossaire FR/EN — TCG Nexus

> À relire et amender avant la traduction en masse des domaines fonctionnels.
> Toute traduction d'interface doit s'y conformer.

## Ton et style

| Règle | FR | EN |
|---|---|---|
| Adresse à l'utilisateur | vouvoiement | 2e personne neutre |
| Titres et boutons | infinitif (« Créer une annonce ») | impératif (« Create a listing ») |
| Casse des titres | phrase (« Mes commandes ») | phrase (« My orders »), pas de Title Case |
| Ponctuation | espace insécable avant `: ; ? !` | pas d'espace avant |

## Termes métier

| FR | EN | Notes |
|---|---|---|
| Carte | Card | |
| Deck | Deck | anglicisme conservé en FR |
| Booster | Booster pack | « Booster » seul en FR |
| Set | Set | jamais « ensemble » |
| Série | Series | invariable en EN |
| Extension | Expansion | synonyme de set côté éditeur |
| Rareté | Rarity | |
| État | Condition | état physique d'une carte |
| Illustrateur | Illustrator | |
| Pokédex | Pokédex | accent conservé dans les deux langues |

## Marketplace

| FR | EN | Notes |
|---|---|---|
| Marketplace | Marketplace | anglicisme conservé en FR |
| Annonce | Listing | jamais « ad » ni « advert » |
| Vendeur | Seller | pas « vendor » |
| Acheteur | Buyer | |
| Panier | Cart | pas « basket » |
| Commande | Order | |
| Paiement | Checkout | l'étape ; « Payment » pour le moyen |
| Frais de port | Shipping | |
| Produit scellé | Sealed product | |
| Prix de référence | Market price | prix constaté, non fixé par le vendeur |

## Tournois et jeu

| FR | EN | Notes |
|---|---|---|
| Tournoi | Tournament | |
| Bracket | Bracket | anglicisme conservé en FR |
| Ronde | Round | pas « tour » |
| Poule | Pool | |
| Seed | Seed | anglicisme conservé en FR |
| Match | Match | |
| Partie | Game | une partie dans un match |
| Inscription | Registration | |
| Classement | Leaderboard | la page ; « Ranking » pour la position |
| Récompense | Reward | |
| Organisateur | Organizer | orthographe US |

## Compte et social

| FR | EN | Notes |
|---|---|---|
| Collection | Collection | |
| Profil | Profile | |
| Paramètres | Settings | |
| Se connecter | Sign in | pas « log in » |
| S'inscrire | Sign up | pas « register », réservé aux tournois |
| Se déconnecter | Sign out | |
| Badge | Badge | |
| Défi | Challenge | |
| Abonné / Abonnement | Follower / Following | au sens social |
| Support | Support | |
| Ticket | Ticket | |

## Noms non traduisibles

TCG Nexus, Pokémon, TCGdex, Cardmarket, TCGplayer, Stripe.

## Pièges

- **Set** ne se traduit jamais par « ensemble » ni **deck** par « paquet ».
- **Condition** (état de carte) ≠ **State** (état d'un objet logiciel).
- **Rating** (score) ≠ **Ranking** (position) ≠ **Leaderboard** (la page).
- Ne pas concaténer de fragments traduits : une phrase = une clé, avec des
  variables ICU pour les valeurs.
- Les pluriels passent par ICU (`{count, plural, ...}`), jamais par un `if`.
