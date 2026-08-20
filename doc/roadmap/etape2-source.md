---
title: "Élaboration de la roadmap"
subtitle: "TCG Nexus, plateforme communautaire de Trading Card Games"
author: "Groupe GPE 1073233 (activity-55295)"
date: "CMG-MGQ5, Management de la qualité, étape 2. Version du 20 août 2026"
---

## Avant-propos

Ce document restitue la roadmap du projet TCG Nexus : ce qui a été livré depuis le démarrage en février 2025, ce qui est en cours, et ce que nous projetons ensuite. Il est construit à partir de nos sources de travail réelles, à savoir 828 commits, 8 fiches de RUN, le board GitHub Projects et le pré-mortem de l'étape 1.

**Version et mise à jour.** Cette version est datée du 20 août 2026. La roadmap étant par nature un document vivant, elle est révisée à chaque fin de cycle et republiée à chaque revue trimestrielle. Les parties 1 à 3 sont donc rétroactives sur la période écoulée (février 2025 à juin 2026), la partie 4 décrit le trimestre en cours et le suivant, et les parties 5 et 6 projettent au-delà.

**Sur l'horizon à trois ans.** Le sujet demande explicitement un calendrier du projet sur trois ans, à reporter dans le manuel d'organisation. Nous couvrons donc février 2025 à décembre 2027. La partie 2027 dépasse le cadre de notre scolarité, qui s'achève en septembre 2026 : elle décrit une trajectoire produit, pas un engagement de livraison de notre part. Sa granularité est volontairement grossière, semestrielle plutôt que trimestrielle, et nous l'assumons comme telle.

| Membre | Login ETNA |
| --- | --- |
| Raphaël PLASSART | plassa_r |
| Lucas AYMARD | aymard_l |
| Hugo PERON | peron_h |
| Jounayd MOSBAH | mosbah_j |
| Ethan GOUILLART | gouill_e |

\newpage

# 1. Contexte et méthode

## 1.1 Rappel du projet

TCG Nexus est une plateforme web et mobile destinée aux joueurs et collectionneurs de Trading Card Games. Elle réunit en un seul outil quatre usages aujourd'hui éclatés entre une dizaine de services concurrents : la gestion de collection, une marketplace sécurisée d'achat et de revente, l'organisation de tournois avec classement, et des outils d'aide au deckbuilding assistés par IA. Le projet cible en priorité la communauté francophone, mal servie par des acteurs majoritairement anglophones.

Techniquement, il s'agit d'un monorepo Turborepo réunissant six applications (API NestJS, web Next.js, mobile Expo, microservice de vision, microservice de synchronisation du catalogue, portail de documentation) et six paquets partagés. Le déploiement est continu, sur une VM pilotée par Coolify, et la plateforme est exposée sur tcg-nexus.org.

Au moment de cette révision : 18 mois de développement, 828 commits, 8 RUNs documentés, 5 développeurs.

## 1.2 Démarche suivie

Nous avons appliqué la démarche en quatre temps préconisée par le sujet, en partant de l'existant plutôt que d'une page blanche.

**Collecter.** Nous avons extrait toutes les fonctionnalités mentionnées dans les 8 fiches de RUN, les 46 modules de l'API, les issues GitHub ouvertes et fermées, la story map Figma et le pré-mortem. Nous y avons ajouté les idées jamais formalisées mais discutées en équipe. Le résultat brut comptait 187 entrées, avec de nombreux doublons d'un RUN à l'autre.

**Regrouper.** Nous avons fusionné ces doublons et rattaché chaque item à l'une des dix épics fonctionnelles définies en 2.1. Les items trop fins, de l'ordre de la demi-journée, ont été agrégés à leur épic parente. Il en reste 154.

**Hiérarchiser.** La priorisation de P0 à P3 suit deux axes : la valeur pour l'utilisateur final, et la dépendance technique, un item qui en bloque d'autres remontant mécaniquement. Le pré-mortem a servi de filtre supplémentaire : toute contre-mesure jugée critique (tests, monitoring, migrations, vérification d'adresse e-mail) a été forcée en P0 sur la version 1.0.

**Séquencer.** Nous avons réparti le tout sur des versions trimestrielles, en respectant les dépendances et une capacité réelle de 10 à 12 jours-homme par développeur et par cycle de quatre semaines. Ce chiffre vient de nos RUNs 7 et 8, pas d'une estimation optimiste.

Une contrainte domine ce dimensionnement : l'alternance. Nous sommes cinq alternants travaillant de façon asynchrone, avec une disponibilité effective d'environ un jour à un jour et demi par semaine. C'est ce qui explique un rythme de livraison trimestriel plutôt que mensuel, et c'est aussi ce qui justifie qu'une part importante du planning 2027 reste en granularité grossière. Le pré-mortem avait identifié le décrochage d'un membre et la désynchronisation des branches parmi les risques les plus probables ; la roadmap intègre directement leurs contre-mesures.

## 1.3 Contenu du document

| Partie | Livrable | Audience et objet |
| --- | --- | --- |
| 2 | Liste d'idées, backlog produit | Interne. L'inventaire de tout ce que nous avons en tête, y compris ce que nous savons ne pas pouvoir livrer. Ce n'est pas encore une roadmap. |
| 3 | Plan de livraison, roadmap publique | Externe : utilisateurs, jury, partenaires. Sans jargon, orientée bénéfice. |
| 4 | Roadmap interne, Gantt et cartes | Interne : les 5 développeurs. Dates, dépendances, assignations, catégories techniques. |
| 5 | Justification des choix | Pourquoi ces modèles, cet outil, cet axe de découpage, et pourquoi deux formats. |
| 6 | Calendrier du projet sur 3 ans | Section reportée dans le manuel d'organisation. |
| 7 | Accès et suivi | Liens vers la roadmap vivante et engagement de mise à jour. |

\newpage

# 2. La liste d'idées

Cette liste n'est pas la roadmap, c'est sa matière première. Elle recense 154 idées et fonctionnalités, qu'elles soient déjà livrées, en cours, planifiées, ou simplement notées pour plus tard. Elle est volontairement plus large que ce que nous pourrons livrer : c'est précisément ce qui permet ensuite d'arbitrer.

## 2.1 Les dix épics

Chaque idée est rattachée à l'une des dix épics ci-dessous. Le découpage est fonctionnel : il correspond à ce qu'un utilisateur peut faire sur la plateforme, pas à la couche technique concernée. La justification de ce choix figure en partie 5.3.

| Code | Épic | Périmètre | Items |
| --- | --- | --- | --- |
| CAT | Catalogue et recherche | Référentiel de cartes, extensions, produits scellés, traductions, recherche textuelle et visuelle, cotation | 19 |
| COL | Collection et decks | Gestion de collection, wishlist, favoris, construction et partage de decks | 17 |
| MKT | Marketplace et paiement | Annonces, panier, commandes, paiement, vendeurs, litiges commerciaux | 21 |
| TRN | Tournois et compétition | Création et gestion de tournois, brackets, matchs, classement ELO, arbitrage | 16 |
| GME | Jeu en ligne et mini-jeux | Moteur de règles, matchs en temps réel, mini-jeux, spectateur | 11 |
| IA | Intelligence artificielle et scan | Analyse de deck, recommandations, OCR, vision par ordinateur, similarité visuelle | 11 |
| COM | Communauté et social | Profils publics, follow, flux, badges, défis, notifications, support | 16 |
| MOB | Application mobile | Application Expo : parité fonctionnelle, scan embarqué, distribution sur les stores | 13 |
| SEC | Compte et sécurité | Authentification, rôles, SSO, RGPD, protection de la plateforme | 12 |
| QUA | Qualité, infrastructure et data | CI/CD, tests, monitoring, migrations, performance, dette technique | 18 |

## 2.2 État du backlog par épic

Le backlog complet, item par item, vit sur le board GitHub Projects dont le lien figure en partie 7. Le reproduire intégralement ici alourdirait ce document sans rien apporter : une liste de 154 lignes figées serait fausse dans un mois. Nous en donnons donc l'état de synthèse, et renvoyons au board pour le détail à jour.

| Épic | Livré | En cours | Planifié | Idée | Chantiers restants les plus structurants |
| --- | --- | --- | --- | --- | --- |
| CAT | 12 | 1 | 5 | 1 | Cotation multi-sources, abstraction multi-TCG |
| COL | 10 | 2 | 3 | 2 | Partage public de deck, complétion par extension |
| MKT | 14 | 0 | 5 | 2 | Reversement aux vendeurs, avis et litiges |
| TRN | 10 | 1 | 3 | 2 | Arbitrage des scores, tournoi en ligne de bout en bout |
| GME | 8 | 1 | 1 | 1 | Matchmaking par niveau ELO |
| IA | 7 | 0 | 1 | 3 | Alternatives de cartes, pré-évaluation d'état par photo |
| COM | 8 | 3 | 2 | 3 | Flux communautaire, modération de contenu |
| MOB | 7 | 3 | 2 | 1 | Notifications natives, publication sur les stores |
| SEC | 6 | 1 | 4 | 1 | Vérification d'e-mail, rate limiting, RGPD |
| QUA | 8 | 1 | 8 | 1 | Migrations, staging, rollback, monitoring, tests de charge |
| **Total** | **90** | **13** | **34** | **17** | |

## 2.3 Idées écartées

Une liste d'idées n'a de valeur que si elle assume aussi les renoncements. Les items suivants ont été discutés puis explicitement retirés du périmètre. Les conserver ici évite de les redécouvrir et de les rediscuter dans six mois.

| Idée écartée | Motif |
| --- | --- |
| Applications natives Swift et Kotlin | Deux bases de code supplémentaires à maintenir, incompatible avec une équipe de cinq alternants. Expo couvre le besoin avec une seule. |
| Certification des cartes par blockchain | Aucune demande utilisateur identifiée, forte défiance de la communauté TCG, complexité réglementaire disproportionnée. |
| Matchmaking IA avancé | Identifié au pré-mortem comme facteur de dispersion. Remplacé par un matchmaking ELO simple, reporté en V1.1. |
| Réseau social complet | Périmètre concurrent de Discord, où la communauté est déjà installée. Nous nous limitons au nécessaire pour la confiance entre acheteurs et vendeurs. |
| Impression et vente de proxies | Zone juridique grise vis-à-vis des ayants droit, pour une valeur apportée faible. |
| Plus de trois TCG dès la V2.0 | L'abstraction du modèle de carte doit être validée sur un seul jeu additionnel avant d'être généralisée. |

### Ce que cet inventaire nous a appris

Sur 154 idées, 90 sont déjà livrées, soit 58 %, 13 sont en cours, 34 sont planifiées et datées, et 17 restent au stade d'idée non engagée. S'y ajoutent six renoncements assumés. Le rapport est inhabituel pour une roadmap : nous documentons un projet largement construit plutôt qu'un projet à lancer.

C'est ce constat qui a orienté toute la suite. L'enjeu des prochains mois n'est plus d'ajouter des fonctionnalités, mais de rendre livrable au public ce qui existe déjà. D'où une version 1.0 presque entièrement composée d'items de qualité, de sécurité et d'infrastructure issus du pré-mortem.

\newpage

# 3. Plan de livraison, roadmap publique

Ce plan s'adresse aux joueurs et collectionneurs, aux organisateurs de tournois, aux boutiques partenaires, au jury et à d'éventuels investisseurs. Aucun terme technique, aucun nom de ticket, aucune assignation. Il répond à une seule question : qu'est-ce que je vais pouvoir faire, et quand ?

## 3.1 Vue d'ensemble

Nous livrons par versions trimestrielles. Chaque version répond à un usage complet plutôt qu'à un empilement de fonctionnalités isolées. Les dates au-delà de mars 2027 sont des intentions et non des engagements ; elles sont affichées à l'échelle du trimestre et communiquées comme telles.

| Version | Thème | Période | Statut | Promesse utilisateur |
| --- | --- | --- | --- | --- |
| V0.1 | Fondations | fév. à juin 2025 | Livré | Consulter le catalogue complet des cartes Pokémon. |
| V0.2 | Première boucle d'usage | juil. à oct. 2025 | Livré | Créer un compte, gérer sa collection, vendre, s'inscrire à un tournoi. |
| V0.3 | Marketplace complète | nov. 2025 à fév. 2026 | Livré | Acheter et payer réellement, construire ses decks. |
| V0.4 | Compétition et jeu en ligne | fév. à avr. 2026 | Livré | Jouer en ligne, être classé, progresser. |
| V0.5 | Mobile et reconnaissance de cartes | avr. à juin 2026 | Livré | Scanner ses cartes au téléphone pour importer sa collection. |
| V0.6 | Social et connexion simplifiée | juil. à sept. 2026 | En cours | Se connecter en un clic, suivre d'autres joueurs, partager ses decks. |
| V1.0 | Ouverture publique | oct. à déc. 2026 | Planifié | Une plateforme fiable, sécurisée et ouverte à tous. |
| V1.1 | Confiance et mobile | janv. à mars 2027 | Planifié | Acheter en confiance, retrouver TCG Nexus sur les stores. |
| V2.0 | Multi-univers | avr. à sept. 2027 | Envisagé | Gérer aussi ses cartes Yu-Gi-Oh! et Magic. |
| V2.5 | Écosystème | oct. à déc. 2027 | Envisagé | Des outils avancés pour les joueurs réguliers et les boutiques. |

## 3.2 Ce qui est déjà disponible

*Versions 0.1 à 0.5, livrées entre février 2025 et juin 2026.*

Sur tcg-nexus.org, vous pouvez dès aujourd'hui :

- Explorer le catalogue complet des cartes Pokémon, en français comme en anglais, extensions et produits scellés inclus, avec une recherche instantanée.
- Gérer votre collection : suivre vos cartes et leur état, tenir une liste de souhaits, marquer vos favoris, et voir la valeur de votre collection évoluer.
- Scanner vos cartes avec votre téléphone pour les ajouter automatiquement à votre collection, y compris lorsque deux cartes se ressemblent beaucoup.
- Construire et gérer vos decks : création guidée, duplication, consultation carte par carte.
- Acheter et vendre : mise en vente en quelques clics, panier, paiement sécurisé par carte bancaire, suivi de commande, historique de prix pour acheter au bon moment.
- Participer à des tournois : en trouver un, s'y inscrire, suivre les brackets et les résultats. Les organisateurs disposent d'un tableau de bord de participation.
- Jouer en ligne contre l'ordinateur ou contre d'autres joueurs, directement dans le navigateur.
- Progresser : classement ELO, leaderboard public, badges, défis quotidiens et hebdomadaires.
- Analyser vos decks : évaluation stratégique visuelle et recommandations de cartes personnalisées.
- Retrouver sur mobile votre collection, le Pokédex, le scan, les tournois et votre profil, sur iOS comme sur Android.

## 3.3 Maintenant, ensuite, plus tard

### Maintenant. V0.6, social et connexion simplifiée (juillet à septembre 2026)

- Connexion en un clic avec votre compte Google ou Discord, sur le web comme sur mobile.
- Un fil communautaire pour publier vos trouvailles et partager vos decks avec les joueurs qui vous suivent.
- Une boutique de récompenses : dépensez les points gagnés en jouant contre des badges et des éléments de personnalisation.
- Un arbitrage des scores contestés en tournoi, pour que les litiges se règlent sans quitter la plateforme.
- Comparer deux decks côte à côte, et exporter vos listes en PDF ou CSV pour les emmener en tournoi.
- Choisir précisément vos notifications : par e-mail, en push, ou pas du tout.

### Ensuite. V1.0, ouverture publique (octobre à décembre 2026)

C'est le passage de la bêta à une plateforme ouverte à tous.

- Ouverture des inscriptions au public, avec vérification de l'adresse e-mail à la création du compte.
- Reversement automatique aux vendeurs après chaque vente, sans intervention manuelle.
- Maîtrise de vos données : export complet et suppression de compte en autonomie, conformément au RGPD.
- Une plateforme plus rapide et plus stable : temps de chargement réduits, supervision continue du service, rétablissement rapide en cas d'incident.
- Partage public de vos decks par simple lien, et publication d'actualités par les organisateurs de tournois.
- Tournois en ligne de bout en bout : s'inscrire, être appairé, jouer et voir son classement mis à jour sans quitter le site.

### Ensuite. V1.1, confiance et mobile (janvier à mars 2027)

- Avis et notes sur les vendeurs après chaque transaction.
- Un service de médiation en cas de colis non reçu ou de carte non conforme à l'annonce.
- Vérification d'identité des vendeurs importants, et double authentification pour protéger votre compte.
- L'application mobile disponible sur l'App Store et Google Play.
- Alertes de prix : soyez prévenu dès qu'une carte que vous cherchez passe sous votre budget.
- Suivi de complétion par extension : voyez d'un coup d'œil ce qu'il vous manque pour compléter un set.
- Modération communautaire et signalement de contenu.

### Plus tard. V2.0 et V2.5 (2027)

Ces deux versions sont des intentions de trajectoire, pas des engagements datés.

- Support de Yu-Gi-Oh! puis de Magic: The Gathering sur l'ensemble du parcours, avec une seule collection pour plusieurs univers et des formats de tournoi propres à chaque jeu.
- Une offre Premium pour les joueurs réguliers : analyses avancées, alertes illimitées, statistiques historiques.
- Un espace dédié aux boutiques partenaires qui organisent des tournois.
- Une interface anglophone, et une API publique pour les créateurs d'outils communautaires.

### Ce que nous ne ferons pas

Par transparence, et parce que la question nous est régulièrement posée : nous ne développerons pas de messagerie privée ni de groupes, la communauté étant déjà sur Discord et nous ne cherchons pas à l'en déloger. Nous ne proposerons pas non plus de certification blockchain des cartes, ni d'impression de proxies. Ces choix sont assumés et documentés.

\newpage

# 4. Roadmap interne

Ce document s'adresse aux cinq développeurs de l'équipe, et par extension à toute personne devant reprendre un sujet. Ici on ne cherche pas à séduire, on cherche à savoir qui fait quoi, pour quand, et ce que ça bloque. C'est le document que nous ouvrons à chaque point de synchronisation hebdomadaire.

## 4.1 Mode de lecture

La roadmap interne se lit à deux échelles. Le diagramme de Gantt de la partie 4.2 donne la vue macro sur trois ans : 54 chantiers répartis sur les dix épics, avec leur position dans le temps et leur état d'avancement. Les cartes détaillées des parties 4.4 et 4.5 donnent la vue micro sur l'horizon actionnable, soit le trimestre en cours et le suivant, avec pour chaque élément un titre explicite, une catégorie technique, une description, un responsable et une date butoir.

Au-delà de six mois, nous refusons volontairement de descendre à la granularité de la carte. L'expérience des huit RUNs écoulés montre qu'une carte planifiée à plus de deux trimestres est systématiquement reformulée avant d'être exécutée : la détailler serait du travail perdu, et donnerait une fausse impression de maîtrise.

Nous ne sommes pas organisés en équipes séparées, chacun intervenant sur l'ensemble de la pile technique. Chaque épic a néanmoins un référent identifié, chargé d'en connaître l'état, d'arbitrer ses priorités en revue de cycle et de servir de point d'entrée si quelqu'un doit reprendre le sujet. Cette responsabilité est distincte de l'assignation des cartes : un référent ne développe pas nécessairement tout ce qui relève de son épic.

| Référent | Épics dont il a la charge |
| --- | --- |
| Raphaël PLASSART | CAT, MKT, IA |
| Lucas AYMARD | COL, QUA |
| Hugo PERON | COM |
| Jounayd MOSBAH | TRN, GME, SEC |
| Ethan GOUILLART | MOB |

## 4.2 Diagramme de Gantt, février 2025 à décembre 2027

\input{gantt.tex}

## 4.3 Jalons structurants

| Échéance | Jalon | Critère de franchissement |
| --- | --- | --- |
| juin 2025, atteint | Socle technique validé | Monorepo opérationnel, catalogue Pokémon complet synchronisé, première page consultable. |
| oct. 2025, atteint | Première boucle d'usage | Un utilisateur peut créer un compte, ajouter une carte à sa collection, la mettre en vente et s'inscrire à un tournoi. |
| fév. 2026, atteint | Première transaction réelle | Paiement Stripe encaissé de bout en bout, commande générée et reçu délivré. |
| juin 2026, atteint | Déploiement continu en production | CI verte à chaque pull request, déploiement automatique sur tcg-nexus.org, 721 tests unitaires au vert. |
| sept. 2026, en cours | Version 0.6 close | SSO opérationnel, flux communautaire en ligne, arbitrage des scores fonctionnel. Gel des nouvelles fonctionnalités. |
| **déc. 2026, cible** | **Ouverture publique (V1.0)** | Migrations TypeORM en place, staging distinct, rollback testé, Sentry actif, couverture front supérieure ou égale à 50 %, vérification d'e-mail obligatoire, conformité RGPD, tests de charge passés. |
| mars 2027, cible | Présence sur les stores | Application Expo validée par Apple et Google, notifications push natives en production. |
| sept. 2027, cible | Second TCG en production | Yu-Gi-Oh! disponible sur l'ensemble du parcours. |
| déc. 2027, cible | Modèle économique activé | Offre Premium et commission de service opérationnelles. |

### Le jalon de décembre 2026 conditionne tout le reste

La V1.0 ne contient presque aucune fonctionnalité visible. C'est délibéré, et c'est la décision la plus structurante de cette roadmap. Le pré-mortem de l'étape 1 a identifié huit causes d'échec, dont sept relèvent de la qualité et de l'exploitation : `synchronize` actif en production, absence de rollback, absence de monitoring, 12 % de couverture frontend, vérification d'e-mail manquante, absence de cache, logs non maîtrisés. Ouvrir la plateforme au public sans traiter ces points reviendrait à transformer chaque risque identifié en incident réel devant des utilisateurs. Nous consacrons donc un trimestre entier à la dette, et nous l'assumons publiquement dans le plan de livraison sous le libellé « une plateforme plus rapide et plus stable ».

\newpage

## 4.4 Cartes du trimestre en cours (V0.6)

Périmètre gelé au 30 septembre 2026. Chaque carte porte les cinq attributs attendus : titre explicite, catégorie, description, responsable, date butoir ; les échéances sont en 2026. Elles sont synchronisées avec le board GitHub Projects dont le lien figure en partie 7.

| Titre | Catégorie | Resp. | Échéance | Description |
| --- | --- | --- | --- | --- |
| SSO Google et Discord, backend | Back-end | R. PLASSART | 31/08 | Stratégies OAuth2 dans NestJS, rattachement par e-mail, mêmes JWT. Bloque le SSO mobile. |
| Journalisation des requêtes API | Back-end | H. PERON | 31/08 | Intercepteur journalisant route, statut, durée et utilisateur, données sensibles masquées. |
| Export de deck en PDF et CSV | Front-end | L. AYMARD | 31/08 | Format decklist officiel imprimable, plus un CSV réimportable. Reporté depuis le RUN 7. |
| SSO Google et Discord, mobile | Mobile | J. MOSBAH | 15/09 | Deep linking et redirections iOS et Android, jetons en stockage sécurisé. À valider sur appareil réel. |
| Flux communautaire | Full-stack | E. GOUILLART | 15/09 | Entité Post, fil filtré sur les suivis, pagination par curseur obligatoire au vu du RUN 7. |
| Litiges et arbitrage des scores | Back-end | R. PLASSART | 15/09 | Dépôt et résolution réservés à l'organisateur, preuves images compressées vers R2. |
| Préférences de notification | Full-stack | H. PERON | 15/09 | Matrice catégorie d'événement par canal, respectée par le service de notification. |
| Leaderboard des mini-jeux | Back-end | J. MOSBAH | 15/09 | Classement par jeu sur période glissante, XP alimentant le solde de points. |
| Boutique de points, backend | Back-end | E. GOUILLART | 30/09 | Catalogue d'articles, solde, achat atomique avec verrou pessimiste, historique. |
| Boutique de points, interface | Front-end | L. AYMARD | 30/09 | Grille, solde permanent et confirmation d'achat, sur les composants de la marketplace. |
| File des notifications de tournoi | Back-end | H. PERON | 30/09 | Envoi en masse asynchrone avec relance, pour ne plus bloquer la requête HTTP. |
| Comparateur de decks | Front-end | R. PLASSART | 30/09 | Superposition de deux à quatre decks sur le radar existant, avec export d'image. |
| Profil public et follows sur mobile | Mobile | J. MOSBAH | 30/09 | Portage Expo des écrans profil, abonnés et abonnements. Backend livré au RUN 7. |
| Scan en rafale et mode révision | Mobile | L. AYMARD | 30/09 | Plusieurs cartes à la suite, puis révision en une passe avec correction des cas ambigus. |
| Cache et indexation CLIP | Back-end | R. PLASSART | 30/09 | Cache des vecteurs les plus scannés, repli sur l'OCR local au-delà d'un délai. |

### Capacité et charge du trimestre

Notre capacité mesurée est de 10 à 12 jours-homme par développeur et par cycle de quatre semaines, soit environ 55 jours-homme pour l'équipe. Le périmètre ci-dessus représente 52 jours-homme estimés : nous sommes à la limite haute, sans marge pour les imprévus. C'est un signal que nous surveillons, car sur les RUNs 5 à 7 un dépassement systématique a produit un report de 5 à 11 items par cycle.

| Développeur | Domaine principal | Capacité | Charge V0.6 | Marge |
| --- | --- | --- | --- | --- |
| Raphaël PLASSART | Architecture, back-end, IA | 12 j | 12 j | 0 |
| Lucas AYMARD | Front-end web et mobile | 11 j | 10 j | 1 j |
| Jounayd MOSBAH | Back-end, tournois, mobile | 11 j | 10 j | 1 j |
| Hugo PERON | Notifications, support, observabilité | 11 j | 11 j | 0 |
| Ethan GOUILLART | Communauté, gamification, infrastructure | 10 j | 9 j | 1 j |

\newpage

## 4.5 Cartes du trimestre suivant (V1.0)

Périmètre d'octobre à décembre 2026, échéances en 2026. Les lignes en gras sont des contre-mesures directes du pré-mortem de l'étape 1 : elles ne sont pas négociables et conditionnent le franchissement du jalon d'ouverture publique.

| Titre | Catégorie | Resp. | Échéance | Description |
| --- | --- | --- | --- | --- |
| **Migrations TypeORM, `synchronize` désactivé** | Data | J. MOSBAH | 31/10 | Migration de référence, `synchronize` à false en production, chaîne validée sur staging. Cause d'échec la plus grave du pré-mortem. |
| **Environnement de staging distinct** | Infra | E. GOUILLART | 31/10 | Stack dédiée, base isolée, données anonymisées. Prérequis des migrations et des déploiements. |
| **Logger structuré** | Back-end | H. PERON | 31/10 | Retrait des 52 `console.log`, règle bloquante en CI, Pino. Risque de fuite de jetons. |
| **Vérification d'e-mail** | Sécurité | J. MOSBAH | 31/10 | Lien de vérification, marketplace conditionnée à l'e-mail vérifié. Le drapeau existe, l'envoi non. |
| **Rollback par images Docker** | Infra | E. GOUILLART | 15/11 | Images versionnées, trois dernières conservées, procédure documentée. Remplace le `git reset` serveur. |
| **Monitoring et alerting** | Infra | E. GOUILLART | 15/11 | Sentry, health check, sonde externe. Aujourd'hui aucune erreur utilisateur ne remonte. |
| **Cache Redis** | Performance | J. MOSBAH | 30/11 | Catalogue de 13 965 cartes et listings, TTL et invalidation. Chaque appel frappe la base. |
| **Rate limiting** | Sécurité | R. PLASSART | 30/11 | Limitation par IP et par compte sur l'authentification et le paiement, verrouillage temporaire. |
| Reversement aux vendeurs | Paiement | R. PLASSART | 30/11 | Stripe Connect : onboarding, transfert après réception, remboursements. Voir ADR-005. |
| Partage public de deck | Full-stack | L. AYMARD | 30/11 | Page accessible sans compte, aperçu enrichi. Principal levier d'acquisition à l'ouverture. |
| Notifications push natives | Mobile | H. PERON | 30/11 | FCM et APNs, certificats de production, validation de bout en bout. |
| **Couverture de tests frontend** | QA | L. AYMARD | 15/12 | 50 % au moins, Cypress sur authentification, checkout et création de tournoi. Actuel : 12 %. |
| **Conformité RGPD** | Légal | R. PLASSART | 15/12 | Export et suppression en autonomie, commandes anonymisées pour obligation comptable. |
| **Tests de charge** | QA | H. PERON | 15/12 | Catalogue, recherche et checkout, avec seuils d'acceptation. Condition du jalon. |
| Tournoi en ligne de bout en bout | Full-stack | J. MOSBAH | 15/12 | Inscription, appairage, match, score et classement sans intervention de l'organisateur. |
| Actualités de tournois | Full-stack | E. GOUILLART | 15/12 | Exposition du module article déjà présent côté API, avec notification aux inscrits. |
| Commentaires et réactions | Full-stack | E. GOUILLART | 15/12 | Complément du flux livré en V0.6 : commentaires sur un niveau et réactions. |
| Import de decklist | Front-end | L. AYMARD | 15/12 | Analyse d'une decklist collée, résolution des noms et création du deck. |

## 4.6 Rituels de suivi

Une roadmap qui n'est pas révisée devient un document mort en trois semaines. Le pré-mortem avait identifié la désynchronisation de l'équipe et les 45 branches actives comme un risque majeur. Nous avons donc attaché à cette roadmap un rythme de mise à jour explicite.

| Rituel | Fréquence | Animé par | Objet |
| --- | --- | --- | --- |
| Point de synchronisation | Hebdomadaire | Hugo PERON | Avancement des cartes en cours, levée des blocages, nettoyage des branches obsolètes. Limite de une à deux branches actives par développeur. |
| Revue de cycle | Toutes les 4 semaines | Raphaël PLASSART | Bilan du cycle, arbitrage du report, réestimation de la capacité, ajout des idées émergentes au backlog. |
| Rétrospective | Toutes les 4 semaines | Rôle tournant | Ce qui a fonctionné, ce qui a bloqué, et une seule action d'amélioration engagée pour le cycle suivant. |
| Revue trimestrielle | Trimestrielle | Équipe complète | Repositionnement des jalons, révision du plan de livraison public, republication de la roadmap. |

\newpage

# 5. Justification des choix

Quatre décisions structurent cette roadmap : l'outil, le modèle de visualisation, l'axe de découpage, et l'existence de deux formats distincts. Chacune a été prise contre des alternatives crédibles, que nous exposons ici.

## 5.1 Pourquoi GitHub Projects

Le critère décisif n'a pas été l'esthétique de l'outil, mais le coût de la double saisie. Notre code, nos quelque 190 issues et pull requests et notre intégration continue vivent déjà sur GitHub. Choisir un outil externe imposerait de tenir deux systèmes en cohérence à la main, or le pré-mortem a explicitement identifié le travail asynchrone et la désynchronisation de l'équipe comme l'un des risques les plus probables. Un outil qui exige une discipline supplémentaire serait le premier à être abandonné.

Avec GitHub Projects, une carte de roadmap est une issue. Elle se ferme automatiquement à la fusion de la pull request qui l'implémente, via les mots-clés de fermeture. La roadmap se met donc à jour au rythme du développement, sans que personne n'ait à y penser. C'est la seule propriété qui garantisse qu'elle sera encore juste dans trois mois.

| Alternative | Verdict | Motif |
| --- | --- | --- |
| GitHub Projects | Retenu | Source unique de vérité avec le code. Vues Table, Board et Roadmap sur la même base, donc deux niveaux de lecture sans duplication. Champs personnalisés pour l'épic, la version, la catégorie technique et l'estimation. Gratuit. GitHub publie d'ailleurs sa propre roadmap publique avec cet outil. |
| Trello | Écarté | Le plus lisible visuellement et le plus cité en exemple pour les roadmaps publiques, mais aucune liaison avec les issues ni avec la CI. Chaque avancement devrait être reporté à la main : double saisie garantie, donc obsolescence garantie. |
| Jira | Écarté | Puissant sur la gestion de portefeuille et les dépendances, mais un coût d'administration disproportionné pour cinq personnes. Nous passerions plus de temps à configurer des workflows qu'à livrer. |
| Notion | Écarté | Excellent pour la documentation produit, mais pas d'automatisation entre une issue et une carte. Même problème de fraîcheur que Trello. |
| Taiga, Monday, Airtable | Écarté | Aucun avantage déterminant dans notre contexte, pour un coût d'apprentissage et de migration non nul. |

Une limite que nous assumons : la vue Roadmap de GitHub Projects reste moins expressive qu'un Gantt d'outil dédié, sans représentation des dépendances ni chemin critique. C'est précisément la raison d'être du diagramme de la partie 4.2, produit en complément et régénéré à chaque revue trimestrielle.

## 5.2 Pourquoi un Gantt en interne et un Now/Next/Later en externe

Nous avons évalué les modèles proposés par le sujet à l'aune d'un besoin particulier : notre roadmap doit être rétroactive sur dix-huit mois autant que prospective. Cela élimine d'emblée plusieurs candidats.

**Le Gantt, retenu en interne.** C'est le seul modèle qui rende visibles simultanément la durée des chantiers, leur chevauchement et leur séquence. Il est indispensable pour la partie rétroactive : un Kanban ne dirait pas que la refonte de la marketplace a duré deux trimestres. Il l'est aussi pour nos dépendances fortes, le SSO mobile attendant le SSO backend, la boutique attendant son backend, le rollback attendant le staging. Il permet enfin de confronter visuellement la charge planifiée à la capacité réelle de l'équipe.

**Le Now/Next/Later, retenu en externe.** C'est le standard de fait des roadmaps publiques, utilisé par GitHub, Twitch ou Codecademy. Il communique une intention et un ordre sans prendre d'engagement de date qu'on ne tiendra pas. Nous l'avons renforcé par des versions datées au trimestre pour rester concrets : un « plus tard » sans aucun repère temporel n'inspire pas confiance.

**Ce que nous avons écarté.** Le Kanban n'a aucun axe temporel, et le sujet le souligne lui-même. Nous en conservons un, c'est notre board d'exécution, mais il répond à « où en est cette tâche » et non à « où va le produit ». Les milestones seuls sont trop pauvres pour l'interne : neuf points sur une frise ne permettent ni d'assigner, ni d'estimer, ni de repérer une surcharge, donc nous les gardons en couche complémentaire (partie 4.3) et non comme modèle principal. Le Scrum planning a un horizon d'un sprint, incompatible avec un document à trois ans ; nous l'utilisons en dessous de la roadmap, au niveau du cycle de quatre semaines. Du release plan nous reprenons la logique, dix versions numérotées portant chacune un thème, mais sans en faire le format de représentation.

Le Gantt a lui aussi ses limites, et nous les assumons. C'est un modèle rigide, coûteux à maintenir, et il donne facilement l'illusion d'une maîtrise qu'on n'a pas. Nous l'avons donc contenu à la maille du chantier trimestriel, 54 lignes, et non de la tâche. Descendre plus finement produirait un document faux dès la deuxième semaine.

## 5.3 Pourquoi un découpage par épics fonctionnelles

C'est l'arbitrage sur lequel nous avons le plus hésité. Le découpage par spécialité, back-end, front-end, mobile, DevOps, QA, correspond à l'organisation d'une entreprise structurée, et c'est celui qu'attendrait un lecteur venant d'une DSI. Nous l'avons écarté pour quatre raisons.

Nous sommes cinq développeurs, pas cinq équipes. Le tableau de répartition du RUN 8 le montre : Jounayd MOSBAH livre dans le même cycle du backend OAuth2, un leaderboard et des écrans Expo. Créer une ligne « front-end » et une ligne « mobile » reviendrait à découper une même personne en deux colonnes fictives, et à masquer le vrai facteur de charge, qui est l'individu.

Les dépendances réelles sont fonctionnelles. Le SSO mobile ne dépend pas du « front-end », il dépend du SSO backend. La boutique ne dépend pas du « back-end » en général, elle dépend d'un endpoint précis. Un découpage par couche technique rendrait ces liens illisibles, là où un découpage par épic les met sur la même ligne.

Nous livrons verticalement. Un item n'est terminé que lorsqu'il est utilisable de bout en bout. Une roadmap qui afficherait « API de follow terminée » alors qu'aucun écran ne l'expose donnerait une image fausse de l'avancement. C'est exactement le piège dans lequel nous sommes tombés au RUN 3 avec les decks, dont l'API était complète mais l'interface inexistante.

Enfin, la valeur se raconte par usage. « Back-end » ne veut rien dire pour un utilisateur ou un jury, là où « marketplace et paiement » se comprend immédiatement. Comme le plan de livraison public est une projection de la roadmap interne, un découpage fonctionnel permet de dériver l'un de l'autre sans réécriture.

**L'exception assumée.** Notre dixième épic, qualité et infrastructure, est purement technique et contredit donc notre propre règle. C'est délibéré. Cette dette n'a aucune porte d'entrée fonctionnelle : répartie dans les neuf autres épics, elle serait systématiquement arbitrée en dernier au profit de fonctionnalités visibles. C'est très exactement ce qui s'est produit sur nos RUNs 2 à 6, où les tests unitaires ont été reportés six cycles consécutifs. L'isoler dans une épic dédiée, avec ses propres jalons et son propre référent, est la seule manière que nous ayons trouvée de la rendre non négociable.

**Le compromis retenu.** Chaque carte porte malgré tout une catégorie technique en attribut secondaire. Le board est filtrable sur ce champ, ce qui nous permet de retrouver une lecture par spécialité quand nous en avons besoin, typiquement pour équilibrer la charge en début de cycle. Nous obtenons ainsi les bénéfices des deux découpages sans maintenir deux structures.

## 5.4 Pourquoi deux formats distincts

Les deux documents ne répondent pas à la même question. La roadmap interne répond à « que dois-je faire lundi matin, et qu'est-ce que je bloque si je prends du retard ». Le plan de livraison public répond à « ce projet va-t-il quelque part, et puis-je lui faire confiance ». Un document unique échouerait sur les deux tableaux.

| Critère | Roadmap interne | Plan de livraison public |
| --- | --- | --- |
| Audience | Les 5 développeurs, et toute personne devant reprendre un sujet. | Utilisateurs, organisateurs, boutiques partenaires, jury. |
| Granularité | La carte, soit une unité de travail de 2 à 5 jours. | La version, soit un thème trimestriel cohérent. |
| Engagement de date | Date butoir au jour près, tenue ou renégociée en revue de cycle. | Trimestre sur six mois, semestre au-delà. Jamais de date au jour. |
| Vocabulaire | Jargon technique assumé : TypeORM, Stripe Connect, CLIP, FCM. | Bénéfice utilisateur uniquement. « Reversement automatique aux vendeurs », pas « Stripe Connect ». |
| Dette technique | Détaillée, chiffrée, assignée. C'est l'épic QUA. | Traduite en promesse d'expérience : « une plateforme plus rapide et plus stable ». |
| Ce qui n'y figure pas | Rien n'est masqué, y compris les échecs et les reports. | Ni assignations, ni estimations, ni numéros de tickets. |
| Mise à jour | Continue, automatique à la fermeture d'issue, plus une revue hebdomadaire. | Trimestrielle, avec communication explicite des changements. |

Exposer nos dates internes au public reviendrait à afficher chaque glissement et à détruire notre crédibilité. Inversement, ne tenir qu'un document public priverait l'équipe de tout outil de pilotage. Les exemples fournis par le sujet, GitHub, Twitch, Codecademy, publient tous une version significativement allégée de leur suivi réel.

**La règle de cohérence que nous nous imposons.** Le document public est une projection du document interne, jamais un document parallèle. Concrètement, toute promesse figurant dans le plan de livraison doit être traçable jusqu'à au moins une carte de la roadmap interne, et aucune version publique ne peut être annoncée si les cartes correspondantes ne sont pas créées. Cette règle évite le travers classique du plan public écrit par optimisme, qu'aucune ligne du board ne vient soutenir.

\newpage

# 6. Calendrier du projet sur trois ans

Section destinée à être reportée dans le manuel d'organisation. Le projet a démarré en février 2025 : la première année est réalisée, la deuxième l'est aux trois quarts, la troisième est prospective et dépasse le cadre de notre scolarité.

## Année 1, 2025 : amorçage et validation technique

| Période | Phase | Contenu et livrables |
| --- | --- | --- |
| fév. à mai 2025 | Cadrage et socle | Choix de l'architecture monorepo Turborepo (ADR-001), initialisation de l'API NestJS et du front Next.js, définition de la story map et du backlog initial. Livrable : squelette technique opérationnel. |
| juin à juil. 2025 | Preuve de concept catalogue | Microservice de synchronisation TCGdex, modèles Card, Set et Series avec CRUD complet, recherche par nom, premières pages web. Livrable : V0.1, RUN 1. |
| août à oct. 2025 | Première boucle d'usage | Authentification JWT et rôles, marketplace en consultation et en publication, création et inscription à un tournoi, collection personnelle et wishlist. Livrable : V0.2, RUNs 2 et 3. |
| nov. à déc. 2025 | Approfondissement marketplace | Refonte de la marketplace, statistiques et historique de prix, profils vendeurs, gestion complète des decks, tracking analytique. Livrable : début de V0.3, RUN 4. |

Bilan de l'année 1 : 378 commits, socle technique validé et première boucle d'usage complète. Point faible identifié en rétrospective, aucun test automatisé, reporté à quatre reprises.

## Année 2, 2026 : industrialisation et couverture fonctionnelle

| Période | Phase | Contenu et livrables |
| --- | --- | --- |
| janv. à fév. 2026 | Monétisation technique | Intégration Stripe, tunnel de paiement complet, commandes et reçus, administration des ventes. Livrable : V0.3 close, première transaction réelle. |
| mars à avr. 2026 | Compétition et jeu en ligne | Moteur de tournoi, classement ELO, moteur de règles et parseur d'effets, matchs temps réel via Socket.io, mini-jeux, gamification. Mise en place de la CI. Livrable : V0.4, RUNs 5 et 6. |
| mai à juin 2026 | Mobile et vision par ordinateur | Application Expo, pipeline de scan OCR, recherche par similarité visuelle CLIP, migration des médias vers le CDN, notifications push, profils publics, analyse de deck par IA. Déploiement continu. Livrable : V0.5, RUN 7. |
| juil. à sept. 2026 | Social et connexion simplifiée | SSO Google et Discord, flux communautaire, boutique de points, arbitrage des scores, export et comparaison de decks, journalisation des requêtes. Livrable : V0.6, RUNs 8 et 9. Position actuelle. |
| oct. à déc. 2026 | Consolidation et ouverture publique | Trimestre consacré à la levée de la dette identifiée au pré-mortem : migrations, staging, rollback, monitoring, couverture de tests, logger structuré, cache, vérification d'e-mail, RGPD, tests de charge. Puis ouverture des inscriptions. Livrable : V1.0, jalon majeur. |

Bilan à mi-parcours : 450 commits en sept mois et demi, 721 tests unitaires au vert, plateforme déployée en continu. Le rythme s'est nettement accéléré par rapport à l'année 1 grâce à l'automatisation du déploiement.

## Année 3, 2027 : confiance, extension et modèle économique

Cette année dépasse notre cadre pédagogique. Elle décrit la trajectoire du produit, à une granularité volontairement semestrielle.

| Période | Phase | Orientation |
| --- | --- | --- |
| 1er semestre 2027 | Confiance et distribution | Avis et notation des vendeurs, médiation des litiges, vérification d'identité au-delà d'un seuil, double authentification, modération de contenu, publication sur les stores, alertes de prix. Livrable visé : V1.1. |
| 2e semestre 2027 | Extension et revenus | Abstraction du modèle de carte pour rendre la plateforme agnostique au jeu, puis intégration de Yu-Gi-Oh! et de Magic. Ensuite, offre Premium, commission de service, espace boutique partenaire, internationalisation, API publique. Livrables visés : V2.0 puis V2.5. |

## Lecture du calendrier

La granularité décroît volontairement avec l'éloignement : bimestrielle sur 2025 et 2026, semestrielle sur 2027. Nous ne prétendons pas savoir ce que nous ferons en septembre 2027 au niveau de la tâche. Nous savons en revanche quelle direction nous prenons et dans quel ordre. Toute date au-delà de mars 2027 sera reprécisée lors des revues trimestrielles.

\newpage

# 7. Accès et suivi de la roadmap

## 7.1 Liens

| Ressource | Accès | Lien |
| --- | --- | --- |
| Roadmap interne, vues Roadmap et Table | Équipe | `github.com/users/raphplt`, projet 3 |
| Plan de livraison public, vue Now/Next/Later | Public | Même projet, vue « Public roadmap », filtrée et sans champs techniques |
| Dépôt de développement | Public | `github.com/raphplt/tcg-nexus` |
| Dépôt de rendu ETNA | ETNA | `rendu-git.etna-alternance.net`, dépôt `group-1073233` |
| Plateforme en production | Public | `tcg-nexus.org` |
| Fiches de progression, RUNs 1 à 8 | Équipe | Dépôt de développement, dossier `suivi_de_progression/` |

## 7.2 Structure du board

Le board est configuré avec les champs personnalisés suivants, qui permettent de produire les deux niveaux de lecture depuis une source unique.

| Champ | Type | Usage |
| --- | --- | --- |
| Épic | Liste | CAT, COL, MKT, TRN, GME, IA, COM, MOB, SEC, QUA. Axe principal de regroupement. |
| Version | Liste | V0.1 à V2.5. Permet de reconstituer le plan de livraison automatiquement. |
| Horizon | Liste | Maintenant, ensuite, plus tard. Alimente directement la vue publique. |
| Catégorie technique | Liste | Back-end, front-end, mobile, infra, QA, data. Lecture par spécialité pour l'équilibrage de charge. |
| Priorité | Liste | P0 à P3. |
| Responsable | Utilisateur | Assignation nominative, obligatoire dès qu'une carte passe en « ensuite ». |
| Date butoir | Date | Renseignée sur les horizons proches. Alimente la vue timeline. |
| Estimation | Nombre | En jours-homme. Sert au contrôle de capacité en début de cycle. |
| Public | Booléen | Détermine si la carte apparaît dans la vue publique. |

## 7.3 Engagement de mise à jour

La roadmap restera vivante pendant toute la durée du module. Concrètement, les cartes du cycle en cours se ferment automatiquement à la fusion des pull requests correspondantes, donc la mise à jour est continue et ne dépend d'aucune discipline manuelle. Le point hebdomadaire ajuste les cartes en cours et intègre les idées émergentes au backlog. La revue de fin de cycle arbitre le report et repositionne les cartes glissées. La revue trimestrielle met à jour la vue publique et régénère le diagramme de la partie 4.2. Chaque demande de validation à distance sera l'occasion d'une passe complète, avec un relevé des écarts entre le planifié et le réalisé.

## En résumé

Cette roadmap ne décrit pas un projet à lancer, mais un projet à stabiliser puis à ouvrir. Sur 154 idées recensées, 90 sont déjà en production. L'enjeu des prochains mois n'est donc pas d'en ajouter davantage, mais de rendre l'existant fiable, sûr et exploitable par des utilisateurs réels. C'est ce qui explique la forme du document : un jalon d'ouverture publique en décembre 2026 composé presque uniquement de dette technique, et un plan public qui traduit cette dette en promesse d'expérience plutôt que de la masquer.

