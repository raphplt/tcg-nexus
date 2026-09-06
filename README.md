# TCG Nexus Project

Ce README se trouve à la racine du **dépôt GitLab fourni par l’ETNA** et référence l’ensemble des ressources nécessaires pour accéder à votre projet.

## 🔗 Liens de référence

- **Dépôt de développement (GitHub)** : [https://github.com/raphplt/tcg-nexus](https://github.com/raphplt/tcg-nexus)
- **Dépôt de rendu (GitLab ETNA)** : [https://rendu-git.etna-alternance.net/module-10020/activity-53631/group-1056981](https://rendu-git.etna-alternance.net/module-10020/activity-53631/group-1056981)
- **Story Map Figma** : [[https://www.figma.com/design/xJi3bYfxhX4HsBdPtxrw2r/Story-Map?node-id=0-1](https://www.figma.com/design/xJi3bYfxhX4HsBdPtxrw2r/Story-Map?node-id=0-1)](https://www.figma.com/design/xJi3bYfxhX4HsBdPtxrw2r/Story-Map?node-id=0-1&p=f&t=TNtJuYX659gcvBoe-0)
- **Wireframe Figma** : https://www.figma.com/design/ur8IpT8VxUjc3V7MFkvvTP/Wireframe?t=TNtJuYX659gcvBoe-0
- **Roadmap publique GitHub** : https://github.com/users/raphplt/projects/5
- **Mirroring CI/CD** : GitHub Actions reproduit automatiquement ce repo sur GitLab

## 📂 Structure du projet

- `apps/web` : Front-end Next.js
- `apps/api` : Back-end NestJS
- `apps/fetch` : Microservice Express (fetch)
- `apps/doc` : Documentation technique
- `docs/` : Documentation supplémentaire (architecture, références, tests)

## 📁 Structure de rendu ETNA

- `/fiche_projet/` : **Fiche projet** (PDF) – contexte, objectifs, organisation, choix technos, story map
- `/suivi_de_progression/` : **Documents de suivi** – bilan & plan d’action (tous les 2 RUNs), fichiers datés
- `/apps`, `/docs` : Code source & documentation du POC

## 📝 Fiche Projet

> Chemin : `/fiche_projet/fiche_projet.pdf`

Contient :

- Contexte du projet et problématiques
- Objectifs et solutions proposées
- Organisation de l’équipe et rôles
- Choix méthodologiques (Scrum, sprints) et technos
- Story map et backlog priorisé

## 📊 Suivi de Progression

Dans `/suivi_de_progression/`, chaque fichier `suivi_RUN<N>_<YYYY-MM-DD>.md` comprend :

- Bilan des objectifs du RUN précédent (US réalisées, en cours, bloquées)
- Problèmes rencontrés
- Captures d’écran ou démos
- Plan d’action pour le RUN suivant

## ✅ Documentation Technique & POC

Le POC doit démontrer :

- Valeur d’usage partielle et faisabilité technique
- Respect des contraintes (performance, sécurité, stockage)

### Dossier `apps/doc` ou `docs/`

- `architecture.md` : schéma et explications de l’architecture
- `references.md` : liste des API et bibliothèques utilisées
- Tests : répertoire contenant tests unitaires et fonctionnels
- Commentaires in-code pertinents pour chaque module critique

## 🚀 Installation & Développement

### Prérequis

- Node.js ≥ 18
- npm
- PostgreSQL 15+ avec extension vectorielle `pgvector`
- Docker & Docker Compose
- Turborepo

### Installation

```bash
git clone https://github.com/raphplt/tcg-nexus.git
cd tcg-nexus
npm install
```

### Seed & Préparation de Démonstration

```bash
# Seed initial du catalogue complet Pokémon (séries, sets, cartes & traductions)
npm run seed

# Préparation idempotente du jeu de données de soutenance (comptes démo, tournoi, articles)
npm run demo:prepare

# Réinitialisation rapide et ciblée du tournoi de démonstration (quarts de finale)
npm run demo:reset-tournament
```

### En mode développement

```bash
turbo dev
# ou
npm run dev
```

### Sondes de Santé & Observabilité (Healthchecks)

- `GET /api/health/live` : Sonde de vivacité applicative (Liveness probe)
- `GET /api/health/ready` : Sonde de disponibilité complète (PostgreSQL, pgvector, migrations, microservice Vision)
- `GET /api/health/details` : Diagnostics système détaillés (mémoire, uptime, métadonnées)

### Authentification & Fournisseurs Tiers

- **Web (Next.js)** : Cookies de session sécurisés `HttpOnly`, `SameSite=Lax`, `Secure` (zéro token dans le corps JSON).
- **Mobile (Expo)** : Authentification par jetons JWT persistés dans le `SecureStore`.
- **Google OAuth 2.0 / OpenID Connect** : Flux Authorization Code avec PKCE SHA-256 (`S256`).

### Tests & Couverture de code

Voir le guide complet des tests et du code coverage : [TESTING.md](TESTING.md).

```bash
# Lancer tous les tests du monorepo
npm test

# Lancer la couverture globale et afficher le récapitulatif
npm run test:cov
```

### Déploiement

La plateforme tourne en production sur une VM (ETNA) et est déployée via **Coolify** (self-hosted). Guide complet : [doc/deploiement-vm.md](doc/deploiement-vm.md).

- **CI — GitHub Actions** ([ci.yml](.github/workflows/ci.yml)) : lint → type-check → tests unitaires et intégration → build, à chaque push/PR
- **CD — Coolify** : rebuild et relance automatique de la stack Docker (`web`, `api`, `vision`, `postgres/pgvector`)
- **Exposition** : Cloudflare Tunnel → [tcg-nexus.org](https://tcg-nexus.org) (front, API, docs)

Lancement local de la stack complète :

```bash
docker-compose -f docker-compose.deploy.yml up --build
```

---

## 📜 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE).
