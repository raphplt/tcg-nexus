# Catalogue exhaustif des EffectTypes — TCG Nexus

> Sources : Règlement officiel TCG Pokémon (février 2026), Bulbapedia, recherche web exhaustive.
> Ce document sert de référence pour le schema du parser IA.

---

## 1. Dégâts

| EffectType | Description | Exemples de texte |
|---|---|---|
| `DAMAGE` | Dégâts fixes au Pokémon cible | "60 dégâts" |
| `DAMAGE_PLUS_CONDITIONAL` | Dégâts + bonus conditionnel | "30+ Lancez une pièce. Si c'est face, 30 dégâts supplémentaires." |
| `DAMAGE_MINUS_CONDITIONAL` | Dégâts - réduction conditionnelle | "80- Inflige 10 dégâts de moins pour chaque marqueur de dégâts sur ce Pokémon." |
| `DAMAGE_MULTIPLY` | Dégâts × multiplicateur | "20× Lancez 4 pièces. 20 dégâts pour chaque face." |
| `DAMAGE_PER_ENERGY` | Dégâts par énergie attachée | "20 dégâts pour chaque Énergie attachée à ce Pokémon." |
| `DAMAGE_PER_COUNTER` | Dégâts par marqueur de dégâts | "10 dégâts pour chaque marqueur de dégâts sur le Pokémon Défenseur." |
| `DAMAGE_PER_CARD` | Dégâts par carte (main, banc, défausse...) | "20 dégâts pour chaque Pokémon sur votre Banc." |
| `DAMAGE_PER_PRIZE` | Dégâts liés aux cartes Récompense | "50 dégâts de plus si vous avez plus de cartes Récompense que votre adversaire." |
| `DAMAGE_BENCH` | Dégâts à un Pokémon de Banc spécifique | "Inflige 20 dégâts à l'un des Pokémon de Banc de votre adversaire." |
| `DAMAGE_ALL_BENCH` | Dégâts à tout le Banc adverse | "Inflige 10 dégâts à chacun des Pokémon de Banc de votre adversaire." |
| `DAMAGE_ALL_OPPONENT_POKEMON` | Dégâts à tous les Pokémon adverses | "Inflige 20 dégâts à chacun des Pokémon de votre adversaire." |
| `DAMAGE_OWN_BENCH` | Dégâts à ses propres Pokémon de Banc | "Inflige 10 dégâts à l'un de vos Pokémon de Banc." |
| `DAMAGE_SELF` | Dégâts de recul à soi-même | "Ce Pokémon s'inflige 30 dégâts." |
| `SPREAD_DAMAGE_COUNTERS` | Placer des marqueurs de dégâts librement | "Placez 5 marqueurs de dégâts sur les Pokémon de votre adversaire comme il vous plaît." |
| `PLACE_DAMAGE_COUNTERS` | Placer un nombre fixe de marqueurs | "Placez 3 marqueurs de dégâts sur le Pokémon Défenseur." (≠ dégâts, ignore Faiblesse/Résistance) |
| `SNIPE` | Dégâts directs à un Pokémon quelconque | "Cette attaque inflige 60 dégâts à l'un des Pokémon de votre adversaire." |
| `IGNORE_WEAKNESS` | Ignorer la Faiblesse | "N'appliquez pas la Faiblesse." |
| `IGNORE_RESISTANCE` | Ignorer la Résistance | "N'appliquez pas la Résistance." |
| `IGNORE_EFFECTS` | Ignorer les effets sur le Défenseur | "Les dégâts de cette attaque ne sont affectés par aucun effet sur le Pokémon Défenseur." |
| `FIXED_DAMAGE` | Dégâts non modifiables | Dégâts qui ne sont affectés par rien (Faiblesse, Résistance, effets) |

---

## 2. États Spéciaux

| EffectType | Description | Règle |
|---|---|---|
| `APPLY_SPECIAL_CONDITION` | Appliquer un état spécial | condition: Poisoned, Burned, Asleep, Paralyzed, Confused |
| `REMOVE_SPECIAL_CONDITION` | Retirer un/tous les états spéciaux | "Soignez tous les États Spéciaux de ce Pokémon." |
| `BADLY_POISONED` | Empoisonnement aggravé (2+ marqueurs entre les tours) | "Le Pokémon Défenseur est maintenant Empoisonné. Placez 4 marqueurs de dégâts au lieu d'un entre chaque tour." |
| `INCREASING_POISON` | Poison qui augmente chaque tour | Certaines cartes augmentent les dégâts de poison à chaque tour |

---

## 3. Guérison / Récupération

| EffectType | Description | Exemples |
|---|---|---|
| `HEAL` | Soigner X dégâts | "Soignez 30 dégâts de ce Pokémon." |
| `HEAL_ALL` | Soigner tous les dégâts | "Soignez tous les dégâts de ce Pokémon." |
| `HEAL_BENCH` | Soigner des Pokémon de Banc | "Soignez 10 dégâts de chacun de vos Pokémon de Banc." |
| `DRAIN` | Soigner du montant des dégâts infligés | "Soignez de ce Pokémon autant de dégâts que vous en avez infligés." |
| `REVIVE` | Remettre un Pokémon en jeu depuis la défausse | "Placez un Pokémon de base de votre pile de défausse sur votre Banc." |

---

## 4. Piocher / Chercher

| EffectType | Description | Exemples |
|---|---|---|
| `DRAW_CARD` | Piocher N cartes | "Piochez 3 cartes." |
| `DRAW_UNTIL_HAND_SIZE` | Piocher jusqu'à avoir N cartes en main | "Piochez des cartes jusqu'à en avoir 6 en main." |
| `SEARCH_DECK` | Chercher une carte dans le deck | "Cherchez dans votre deck un Pokémon de base et placez-le sur votre Banc." |
| `SEARCH_DECK_POKEMON` | Chercher un Pokémon spécifiquement | "Cherchez dans votre deck un Pokémon de type Feu." |
| `SEARCH_DECK_ENERGY` | Chercher une carte Énergie | "Cherchez dans votre deck une carte Énergie de base et attachez-la à l'un de vos Pokémon." |
| `SEARCH_DECK_TRAINER` | Chercher une carte Dresseur | "Cherchez dans votre deck une carte Objet." |
| `LOOK_AT_TOP_DECK` | Regarder les X premières cartes du deck | "Regardez les 5 premières cartes de votre deck." |
| `REARRANGE_TOP_DECK` | Réarranger le dessus du deck | "Regardez les 3 premières cartes et replacez-les dans l'ordre de votre choix." |
| `SEARCH_DISCARD` | Récupérer depuis la pile de défausse | "Récupérez une carte Dresseur de votre pile de défausse." |
| `REVEAL_HAND` | Révéler la main (de soi ou adversaire) | "Votre adversaire révèle sa main." |
| `LOOK_AT_OPPONENT_HAND` | Regarder la main adverse | "Regardez la main de votre adversaire." |

---

## 5. Défausse / Disruption main

| EffectType | Description | Exemples |
|---|---|---|
| `DISCARD_FROM_HAND` | Défausser de sa propre main | "Défaussez 2 cartes de votre main." |
| `DISCARD_OPPONENT_HAND` | Forcer la défausse adverse | "Votre adversaire défausse une carte de sa main." |
| `SHUFFLE_HAND_DRAW` | Mélanger la main et piocher | "Votre adversaire mélange sa main avec son deck et pioche 4 cartes." (N, Juge) |
| `RETURN_HAND_TO_DECK` | Remettre la main dans le deck | "Mélangez votre main dans votre deck." |
| `MILL` | Défausser du dessus du deck adverse | "Défaussez les 3 premières cartes du deck de votre adversaire." |

---

## 6. Énergie

| EffectType | Description | Exemples |
|---|---|---|
| `DISCARD_SELF_ENERGY` | Défausser énergie de soi-même (coût d'attaque) | "Défaussez 2 Énergies Feu attachées à ce Pokémon." |
| `DISCARD_ALL_SELF_ENERGY` | Défausser toutes ses énergies | "Défaussez toutes les Énergies attachées à ce Pokémon." |
| `DISCARD_OPPONENT_ENERGY` | Défausser énergie de l'adversaire | "Défaussez une Énergie attachée au Pokémon Défenseur." |
| `DISCARD_SPECIFIC_ENERGY_TYPE` | Défausser un type d'énergie spécifique | "Défaussez toutes les Énergies Électrique attachées à ce Pokémon." |
| `MOVE_ENERGY` | Déplacer énergie entre Pokémon | "Déplacez une Énergie de ce Pokémon vers l'un de vos Pokémon de Banc." |
| `ATTACH_ENERGY_FROM_DECK` | Attacher énergie depuis le deck | "Cherchez dans votre deck jusqu'à 2 Énergies de base et attachez-les à vos Pokémon." |
| `ATTACH_ENERGY_FROM_DISCARD` | Attacher énergie depuis la défausse | "Attachez une Énergie de base de votre pile de défausse à ce Pokémon." |
| `ATTACH_ENERGY_FROM_HAND` | Attacher énergie supplémentaire depuis la main | "Attachez une Énergie de votre main à l'un de vos Pokémon." |
| `REMOVE_SPECIAL_ENERGY` | Retirer les Énergies Spéciales | "Défaussez toutes les Énergies Spéciales attachées au Pokémon Défenseur." |
| `ENERGY_ACCELERATION` | Accélération d'énergie (générique) | Tout effet qui attache des énergies en dehors de la règle 1/tour |

---

## 7. Manipulation du plateau

### 7.1 Switch / Retraite

| EffectType | Description | Exemples |
|---|---|---|
| `SWITCH_OPPONENT_ACTIVE` | Forcer le switch du Pokémon actif adverse (gust) | "Échangez l'un des Pokémon de Banc de votre adversaire avec son Pokémon Actif." |
| `SWITCH_OWN_ACTIVE` | Switcher son propre actif (hit-and-run) | "Échangez ce Pokémon avec l'un de vos Pokémon de Banc." |
| `FREE_RETREAT` | Annuler le coût de retraite | "Le Coût de Retraite de ce Pokémon est réduit de 2." |
| `PREVENT_RETREAT` | Empêcher la retraite | "Le Pokémon Défenseur ne peut pas battre en retraite pendant le prochain tour de votre adversaire." |

### 7.2 Bounce / Retour

| EffectType | Description | Exemples |
|---|---|---|
| `RETURN_TO_HAND` | Renvoyer un Pokémon + cartes attachées en main | "Renvoyez ce Pokémon et toutes les cartes qui lui sont attachées dans votre main." |
| `BOUNCE_OPPONENT_TO_HAND` | Renvoyer un Pokémon adverse en main | "Renvoyez le Pokémon Défenseur et toutes les cartes qui lui sont attachées dans la main de votre adversaire." |
| `SHUFFLE_INTO_DECK` | Mélanger un Pokémon dans le deck | "Mélangez ce Pokémon et toutes les cartes qui lui sont attachées dans votre deck." |
| `SHUFFLE_OPPONENT_INTO_DECK` | Mélanger un Pokémon adverse dans son deck | "Mélangez le Pokémon Défenseur dans le deck de votre adversaire." |

### 7.3 Évolution / Dés-évolution

| EffectType | Description | Exemples |
|---|---|---|
| `DEVOLVE` | Retirer la carte Évolution la plus haute | "Retirez la carte Évolution la plus haute de chacun des Pokémon évolués de votre adversaire." |
| `FORCE_EVOLVE` | Forcer une évolution | "Cherchez dans votre deck un Pokémon qui évolue de l'un de vos Pokémon et faites-le évoluer." |

---

## 8. Protection / Défense

| EffectType | Description | Exemples |
|---|---|---|
| `PREVENT_DAMAGE` | Prévenir tous les dégâts | "Pendant le prochain tour de votre adversaire, ce Pokémon ne subit aucun dégât." |
| `REDUCE_DAMAGE` | Réduire les dégâts reçus | "Pendant le prochain tour de votre adversaire, ce Pokémon subit 30 dégâts de moins." |
| `PREVENT_EFFECTS` | Prévenir les effets d'attaques (hors dégâts) | "Prévenez tous les effets d'attaques, à l'exception des dégâts, infligés à ce Pokémon." |
| `PREVENT_ALL` | Prévenir dégâts + effets | "Pendant le prochain tour de votre adversaire, prévenez tous les dégâts et effets d'attaques infligés à ce Pokémon." |
| `SAFEGUARD` | Protection contre certains types de Pokémon | "Prévenez tous les dégâts des attaques des Pokémon-EX." / "...des Pokémon-ex." |
| `ENDURE` | Survie à 10 PV | "Si ce Pokémon devait être mis K.O. par des dégâts, lancez une pièce. Si c'est face, ce Pokémon n'est pas mis K.O. et ses PV restants deviennent 10." |
| `PROTECT_BENCH` | Protéger le banc des dégâts | "Prévenez tous les dégâts infligés à vos Pokémon de Banc par les attaques." |

---

## 9. Restriction / Lock

| EffectType | Description | Exemples |
|---|---|---|
| `CANT_ATTACK_NEXT_TURN` | Ce Pokémon ne peut pas attaquer au prochain tour | "Ce Pokémon ne peut pas attaquer pendant votre prochain tour." |
| `CANT_USE_SAME_ATTACK` | Ne peut pas utiliser la même attaque | "Ce Pokémon ne peut pas utiliser cette attaque pendant votre prochain tour." |
| `OPPONENT_CANT_ATTACK` | Le Défenseur ne peut pas attaquer | "Le Pokémon Défenseur ne peut pas attaquer pendant le prochain tour de votre adversaire." (souvent sur coin flip) |
| `OPPONENT_CANT_RETREAT` | Le Défenseur ne peut pas battre en retraite | "Le Pokémon Défenseur ne peut pas battre en retraite pendant le prochain tour." |
| `TRAINER_LOCK` | Empêcher de jouer des cartes Dresseur | "Votre adversaire ne peut pas jouer de cartes Dresseur de sa main pendant son prochain tour." |
| `SUPPORTER_LOCK` | Empêcher de jouer des Supporters | "Votre adversaire ne peut pas jouer de carte Supporter pendant son prochain tour." |
| `ITEM_LOCK` | Empêcher de jouer des Objets | "Votre adversaire ne peut pas jouer de carte Objet de sa main." (Quaking Punch) |
| `ABILITY_LOCK` | Désactiver les talents | "Les talents de tous les Pokémon en jeu sont désactivés." |
| `STADIUM_LOCK` | Empêcher de jouer des Stades | Bloquer la pose de Stades |

---

## 10. Coin Flip / Aléatoire

| EffectType | Description | Exemples |
|---|---|---|
| `COIN_FLIP` | Lancer une pièce avec effet conditionnel | "Lancez une pièce. Si c'est face, le Pokémon Défenseur est maintenant Paralysé." |
| `MULTI_COIN_FLIP` | Lancer plusieurs pièces | "Lancez 3 pièces. Cette attaque inflige 30 dégâts pour chaque face." |
| `FLIP_UNTIL_TAILS` | Lancer jusqu'à pile | "Lancez une pièce jusqu'à ce que vous obteniez pile. Inflige 30 dégâts pour chaque face." |

---

## 11. Copie / Transformation

| EffectType | Description | Exemples |
|---|---|---|
| `COPY_ATTACK` | Copier une attaque adverse | "Choisissez l'une des attaques du Pokémon Défenseur et utilisez-la comme cette attaque." (Métronome) |
| `COPY_OWN_ATTACK` | Copier une de ses propres attaques précédentes | Réutiliser une attaque |
| `TRANSFORM` | Se transformer en un autre Pokémon | "Ce Pokémon devient une copie du Pokémon Défenseur (même PV, type, Faiblesse, Résistance, attaques)." |

---

## 12. Deck / Mélange

| EffectType | Description | Exemples |
|---|---|---|
| `SHUFFLE_DECK` | Mélanger le deck | "Mélangez votre deck." |
| `SHUFFLE_INTO_OWN_DECK` | Mélanger des cartes dans son deck | "Mélangez 2 cartes de votre main dans votre deck." |
| `PUT_ON_TOP_DECK` | Placer une carte sur le dessus du deck | "Placez une carte de votre main sur le dessus de votre deck." |
| `PUT_ON_BOTTOM_DECK` | Placer une carte sous le deck | "Placez une carte sous votre deck." |

---

## 13. Zone Perdue (Lost Zone)

| EffectType | Description | Exemples |
|---|---|---|
| `SEND_TO_LOST_ZONE` | Envoyer en Zone Perdue | "Placez cette carte dans la Zone Perdue." |
| `LOST_ZONE_CONDITIONAL` | Effet conditionné au nombre de cartes en Zone Perdue | "Si vous avez 7 cartes ou plus dans la Zone Perdue, cette attaque inflige 120 dégâts supplémentaires." |

---

## 14. Cartes Récompense (Prize)

| EffectType | Description | Exemples |
|---|---|---|
| `EXTRA_PRIZE` | Prendre une Récompense supplémentaire | "Si le Pokémon Défenseur est mis K.O. par cette attaque, prenez une carte Récompense supplémentaire." |
| `FEWER_PRIZE` | L'adversaire prend moins de Récompenses | "Quand ce Pokémon est mis K.O., votre adversaire prend une carte Récompense de moins." |
| `LOOK_AT_PRIZES` | Regarder ses cartes Récompense | "Regardez vos cartes Récompense face cachée." |
| `SWAP_PRIZE` | Échanger une Récompense avec la main | "Échangez l'une de vos cartes Récompense avec une carte de votre main." |

---

## 15. Boost / Modification de dégâts

| EffectType | Description | Exemples |
|---|---|---|
| `BOOST_DAMAGE` | +X dégâts si condition | "Pendant votre prochain tour, les attaques de ce Pokémon infligent 30 dégâts supplémentaires." |
| `BOOST_DAMAGE_NEXT_TURN` | Boost de dégâts au prochain tour | "+40 dégâts au prochain tour (avant application de la Faiblesse et de la Résistance)" |
| `REDUCE_OPPONENT_DAMAGE` | Réduire les dégâts des attaques adverses globalement | Via un Stade ou talent |

---

## 16. Talents (Abilities)

> Les talents ne sont pas des attaques. Ils ont leur propre système de déclenchement.

| EffectType | Description | Exemples |
|---|---|---|
| `ABILITY_ONCE_PER_TURN` | Talent activable une fois par tour | "Une fois pendant votre tour, vous pouvez piocher une carte." |
| `ABILITY_WHEN_PLAYED` | Talent déclenché quand le Pokémon est joué/évolue | "Quand vous jouez ce Pokémon de votre main pour faire évoluer l'un de vos Pokémon, vous pouvez..." |
| `ABILITY_PASSIVE` | Talent passif permanent | "Chacune des attaques de vos Pokémon de type Feu inflige 10 dégâts supplémentaires." |
| `ABILITY_BETWEEN_TURNS` | Talent entre les tours (Contrôle Pokémon) | "Entre chaque tour, soignez 10 dégâts de ce Pokémon." |
| `ABILITY_ACTIVE_ONLY` | Talent qui ne fonctionne que si Pokémon actif | "Fonctionne uniquement si ce Pokémon est votre Pokémon Actif." |
| `ABILITY_BENCH_ONLY` | Talent qui ne fonctionne que depuis le banc | "Fonctionne uniquement si ce Pokémon est sur votre Banc." |
| `ABILITY_AS_OFTEN_AS_YOU_LIKE` | Talent utilisable autant de fois que voulu | "Autant de fois que vous le voulez pendant votre tour, déplacez une Énergie Feu..." |

---

## 17. Règles spéciales Pokémon (Rule Boxes)

> Ces EffectTypes s'appliquent automatiquement selon le type de carte, pas depuis le texte d'attaque.

| EffectType | Description | Cartes Récompenses données |
|---|---|---|
| `RULE_EX_LOWERCASE` | Pokémon-ex (Scarlet & Violet) | 2 |
| `RULE_EX_UPPERCASE` | Pokémon-EX (XY era) | 2 |
| `RULE_GX` | Pokémon-GX | 2 |
| `RULE_V` | Pokémon-V | 2 |
| `RULE_VSTAR` | Pokémon-VSTAR | 2 |
| `RULE_VMAX` | Pokémon-VMAX | 3 |
| `RULE_V_UNION` | Pokémon-V-UNION | 3 |
| `RULE_TAG_TEAM_GX` | ESCOUADE / Tag Team GX | 3 |
| `RULE_MEGA_EX` | Pokémon-EX Méga-Évolution (XY) — fin de tour au Méga-Évolve | 2 |
| `RULE_MEGA_EX_NEW` | Pokémon-ex Méga-Évolution (Méga-Évolution series) | 3 |
| `RULE_TERA` | Pokémon-ex Téracristal — immunité aux dégâts sur le banc | 2 |
| `RULE_RADIANT` | Pokémon Radieux — max 1 dans le deck | 1 |
| `RULE_PRISM_STAR` | Prisme Étoile — max 1 par nom, va en Zone Perdue si défaussé | 1 |
| `RULE_ACE_SPEC` | HIGH-TECH / Ace Spec — max 1 dans le deck | N/A |

---

## 18. Once-per-game (Une fois par partie)

| EffectType | Description | Exemples |
|---|---|---|
| `GX_ATTACK` | Attaque GX — une seule par partie (par joueur) | Attaque avec le label GX |
| `VSTAR_POWER_ATTACK` | Puissance VSTAR (attaque) — une seule par partie | Attaque VSTAR |
| `VSTAR_POWER_ABILITY` | Puissance VSTAR (talent) — une seule par partie | Talent VSTAR |

---

## 19. Cartes Dresseur — Effets de jeu

| EffectType | Description | Exemples |
|---|---|---|
| `TRAINER_ITEM` | Effet d'Objet (play as many) | Ultra Ball, Bonbon Rare, Échange, etc. |
| `TRAINER_SUPPORTER` | Effet de Supporter (1 par tour) | Professeur, N, Boss's Orders |
| `TRAINER_STADIUM` | Effet de Stade (reste en jeu) | Sky Field, Lost City, etc. |
| `TRAINER_TOOL` | Outil Pokémon (attaché à un Pokémon) | Muscle Band, Float Stone, etc. |
| `TRAINER_TECHNICAL_MACHINE` | Capsule Technique (donne une attaque) | Attachée, donne une attaque supplémentaire |
| `TRAINER_FOSSIL` | Carte Fossile (jouée comme Pokémon de base) | Fossile Rare, Fossile Inconnu |

---

## 20. Conditions & Triggers

> Modificateurs qui s'appliquent aux effets ci-dessus.

| Condition | Description | Exemples |
|---|---|---|
| `IF_COIN_HEADS` | Conditionné à face | "Si c'est face, ..." |
| `IF_COIN_TAILS` | Conditionné à pile | "Si c'est pile, ..." |
| `IF_OPPONENT_HAS_MORE_PRIZES` | Si l'adversaire a plus de Récompenses | Counter Energy condition |
| `IF_SELF_HAS_MORE_PRIZES` | Si on a plus de Récompenses | Behind on prizes |
| `IF_ENERGY_ATTACHED` | Si X énergies attachées | "Si ce Pokémon a au moins 3 Énergies Feu attachées..." |
| `IF_DAMAGE_COUNTERS_ON_SELF` | Si marqueurs de dégâts sur soi | "Si ce Pokémon a des marqueurs de dégâts..." |
| `IF_DAMAGE_COUNTERS_ON_TARGET` | Si marqueurs de dégâts sur la cible | "Si le Pokémon Défenseur a des marqueurs de dégâts..." |
| `IF_POKEMON_IN_PLAY` | Si un type de Pokémon est en jeu | "Si vous avez un Pokémon de type Feu sur votre Banc..." |
| `IF_STADIUM_IN_PLAY` | Si un Stade est en jeu | Conditionnel au Stade |
| `IF_FIRST_TURN` | Restriction premier tour | "Vous ne pouvez pas utiliser cette attaque pendant votre premier tour." |
| `IF_CAN_DISCARD` | Si on peut défausser | "Défaussez 2 cartes de votre main. (Si vous ne le pouvez pas, cette attaque ne fait rien.)" |
| `IF_TARGET_STAGE` | Si la cible est d'un certain stade | "Si le Pokémon Défenseur est un Pokémon de base..." |
| `IF_TARGET_TYPE` | Si la cible est d'un certain type | "Si le Pokémon Défenseur est de type Eau..." |
| `IF_EVOLVED` | Si le Pokémon est évolué | "Si ce Pokémon a évolué pendant ce tour..." |
| `IF_LOST_ZONE_COUNT` | Si X cartes en Zone Perdue | "Si vous avez 7 cartes ou plus dans la Zone Perdue..." |

---

## 21. Targets (Cibles)

| TargetType | Description |
|---|---|
| `SELF` | Le Pokémon qui utilise l'attaque/talent |
| `PLAYER_ACTIVE` | Le Pokémon Actif du joueur |
| `OPPONENT_ACTIVE` | Le Pokémon Actif de l'adversaire (Pokémon Défenseur) |
| `PLAYER_BENCH` | Un Pokémon du Banc du joueur |
| `OPPONENT_BENCH` | Un Pokémon du Banc de l'adversaire |
| `ALL_PLAYER_BENCH` | Tous les Pokémon du Banc du joueur |
| `ALL_OPPONENT_BENCH` | Tous les Pokémon du Banc de l'adversaire |
| `ALL_PLAYER_POKEMON` | Tous les Pokémon du joueur (actif + banc) |
| `ALL_OPPONENT_POKEMON` | Tous les Pokémon de l'adversaire |
| `ALL_POKEMON` | Tous les Pokémon en jeu |
| `SELECTED_OWN_POKEMON` | Pokémon choisi par le joueur (nécessite un prompt) |
| `SELECTED_OPPONENT_POKEMON` | Pokémon adverse choisi par le joueur |
| `PLAYER_DECK` | Le deck du joueur |
| `OPPONENT_DECK` | Le deck de l'adversaire |
| `PLAYER_HAND` | La main du joueur |
| `OPPONENT_HAND` | La main de l'adversaire |
| `PLAYER_DISCARD` | La pile de défausse du joueur |
| `OPPONENT_DISCARD` | La pile de défausse de l'adversaire |
| `PLAYER_LOST_ZONE` | La Zone Perdue du joueur |
| `OPPONENT_LOST_ZONE` | La Zone Perdue de l'adversaire |

---

## 22. Durée des effets

| Duration | Description |
|---|---|
| `INSTANT` | Effet immédiat, résolu une fois |
| `UNTIL_END_OF_TURN` | Jusqu'à la fin du tour en cours |
| `UNTIL_NEXT_TURN` | Jusqu'à la fin du prochain tour de l'adversaire |
| `UNTIL_YOUR_NEXT_TURN` | Jusqu'à la fin de votre prochain tour |
| `WHILE_ACTIVE` | Tant que le Pokémon est Actif |
| `WHILE_IN_PLAY` | Tant que le Pokémon est en jeu |
| `BETWEEN_TURNS` | S'applique au Contrôle Pokémon |
| `PERMANENT` | Reste en jeu indéfiniment (ex: Stade, Outil) |
| `ONCE_PER_GAME` | Une seule fois par partie (GX, VSTAR) |

---

## 23. Traits Antiques (Ancient Traits)

| EffectType | Description |
|---|---|
| `ANCIENT_TRAIT_ALPHA_GROWTH` | Attacher 2 Énergies par tour au lieu d'une |
| `ANCIENT_TRAIT_ALPHA_RECOVERY` | Doubler les soins |
| `ANCIENT_TRAIT_OMEGA_BARRAGE` | Peut attaquer 2 fois par tour |
| `ANCIENT_TRAIT_OMEGA_BARRIER` | Non affecté par les cartes Dresseur adverses |
| `ANCIENT_TRAIT_THETA_STOP` | Immunisé aux effets des talents adverses |
| `ANCIENT_TRAIT_THETA_DOUBLE` | Peut avoir 2 Outils Pokémon attachés |
| `ANCIENT_TRAIT_DELTA_PLUS` | Prendre 1 Récompense supplémentaire quand KO un Pokémon |
| `ANCIENT_TRAIT_DELTA_EVOLUTION` | Peut évoluer le tour de mise en jeu |

---

## 24. Mécaniques d'évolution spéciales

| EffectType | Description |
|---|---|
| `MEGA_EVOLUTION_END_TURN` | Fin de tour quand on Méga-Évolue (EX Méga, sauf Spirit Link) |
| `SPIRIT_LINK` | Outil qui empêche la fin de tour lors de la Méga-Évolution |
| `BREAK_EVOLUTION` | Évolution TURBO — conserve attaques/talents du Pokémon en dessous |
| `RARE_CANDY` | Sauter le Niveau 1 (Pokémon de base → Niveau 2 directement) |
| `V_UNION_ASSEMBLY` | Assembler les 4 pièces depuis la défausse |

---

## 25. Effets spéciaux des Énergies Spéciales

| EffectType | Description | Exemples |
|---|---|---|
| `SPECIAL_ENERGY_PROVIDES_MULTIPLE` | Fournit 2+ énergies | Double Colorless, Double Turbo |
| `SPECIAL_ENERGY_PROVIDES_ALL_TYPES` | Fournit tous les types | Rainbow Energy, Aurora Energy |
| `SPECIAL_ENERGY_DAMAGE_REDUCTION` | Réduit les dégâts des attaques | Double Turbo (-20 dégâts) |
| `SPECIAL_ENERGY_ON_ATTACH` | Effet au moment de l'attachement | Capture Energy (chercher Basic), Jet Energy (switch to active) |
| `SPECIAL_ENERGY_ON_KO` | Effet quand le Pokémon attaché est KO | Gift Energy (piocher 3 cartes) |
| `SPECIAL_ENERGY_RETALIATE` | Effet quand le Pokémon prend des dégâts | Horror Energy (2 marqueurs sur l'attaquant) |
| `SPECIAL_ENERGY_CONDITIONAL` | Effet conditionnel | Counter Energy (2 de tout type si plus de Récompenses), Reversal Energy |
| `SPECIAL_ENERGY_HEAL` | Soigner | Certaines énergies spéciales |
| `SPECIAL_ENERGY_PREVENT_CONDITION` | Prévenir les États Spéciaux | Therapeutic Energy |

---

## Résumé quantitatif

| Catégorie | Nombre d'EffectTypes |
|---|---|
| Dégâts | 20 |
| États Spéciaux | 4 |
| Guérison | 5 |
| Piocher/Chercher | 11 |
| Défausse/Disruption main | 5 |
| Énergie | 10 |
| Manipulation plateau | 10 |
| Protection/Défense | 7 |
| Restriction/Lock | 9 |
| Coin Flip | 3 |
| Copie/Transformation | 3 |
| Deck manipulation | 4 |
| Zone Perdue | 2 |
| Récompenses | 4 |
| Boost dégâts | 3 |
| Talents | 7 |
| Règles Pokémon | 16 |
| Once-per-game | 3 |
| Cartes Dresseur | 6 |
| Conditions/Triggers | 16 |
| Targets | 20 |
| Durées | 9 |
| Traits Antiques | 8 |
| Évolutions spéciales | 5 |
| Énergies Spéciales | 9 |
| **TOTAL** | **~199** |

---

## Notes d'implémentation

1. **Dégâts vs marqueurs de dégâts** : Les "dégâts" (damage) passent par Faiblesse/Résistance/effets. Les "marqueurs de dégâts" (damage counters) ignorent tout. C'est une distinction CRITIQUE dans le moteur.

2. **Effets composites** : La majorité des attaques combinent plusieurs EffectTypes. Ex: "Inflige 80 dégâts. Défaussez 2 Énergies Feu. Lancez une pièce, si c'est face, le Pokémon Défenseur est Brûlé." = `[DAMAGE, DISCARD_SELF_ENERGY, COIN_FLIP → APPLY_SPECIAL_CONDITION]`

3. **Conditions imbriquées** : Les COIN_FLIP peuvent contenir des sous-effets eux-mêmes conditionnels.

4. **Durée** : Chaque effet de restriction/protection a une durée (généralement `UNTIL_NEXT_TURN`). Le moteur doit tracker ces effets temporels.

5. **Stacking** : Certains effets se cumulent, d'autres se remplacent (ex: États Spéciaux Endormi/Confus/Paralysé se remplacent mutuellement).
