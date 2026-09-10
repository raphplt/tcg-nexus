---
title: Docker & Environnements Conteneurisés
---

TCG Nexus fournit des configurations Docker prêtes à l'emploi aussi bien pour accélérer le développement local que pour orchestrer la production.

---

## 1. Environnement de Développement Local (`docker-compose.yml`)

Pour le développement au quotidien, la racine du monorepo propose un fichier `docker-compose.yml` allégé qui fournit les deux dépendances d'infrastructure nécessaires à l'API :
1. **`postgres`** : base de données PostgreSQL 15 équipée de l'extension vectorielle **`pgvector`** (port `5432`).
2. **`vision`** : microservice Python FastAPI de traitement d'image et d'OCR Tesseract (port `8000`).

### Démarrage rapide

```bash
# 1. Copier les variables d'environnement de la base
cp env.example .env

# 2. Démarrer PostgreSQL et Vision en arrière-plan
cd apps/api
npm run docker:db

# 3. Lancer l'API en développement local
npm run start:dev
```

### Commandes utiles du cycle de vie Docker local

```bash
cd apps/api
npm run docker:db         # Lance les conteneurs postgres et vision
npm run docker:db-logs    # Affiche les logs en continu
npm run docker:db-down    # Arrête les conteneurs locaux
```

### Connexion directe au client PostgreSQL

```bash
docker exec -it tcg-nexus-postgres psql -U postgres -d tcg_nexus
```

Pour réinitialiser complètement la base de données locale et ses volumes :
```bash
docker compose down -v
```

---

## 2. Peuplement des données initiales (Seeds)

Une fois la base PostgreSQL démarrée, exécutez les scripts de seed pour alimenter votre environnement :

```bash
cd apps/api

# Données principales (séries, sets, cartes Pokémon, tournois de démonstration)
npm run seed

# Comptes utilisateurs de test avec rôles variés (admin, moderator, joueurs)
npm run seed:users

# Référentiel des états d'usure des cartes (Near Mint, Played, etc.)
npm run seed:cardstates

# Synchronisation des effets structurés pour le moteur de règles et l'IA
npm run sync:effects

# Pré-calcul des vecteurs d'archétypes pour la similarité pgvector
npm run embed:decks
```

---

## 3. Pile de Déploiement Complète (`docker-compose.deploy.yml`)

Pour simuler ou déployer l'intégralité de la plateforme dans des conteneurs isolés (API, Web, Docs, Vision, PostgreSQL), le fichier `docker-compose.deploy.yml` est utilisé :

```bash
cd apps/api
npm run docker:up      # Démarre tous les conteneurs en configuration de production
npm run docker:logs    # Affiche les logs de l'ensemble des conteneurs
npm run docker:down    # Stoppe la pile complète
```

Pour les spécificités du déploiement en production sur la VM avec Coolify et Cloudflare Tunnel, consultez le guide [Déploiement en Production & Cloudflare](./deployment).
