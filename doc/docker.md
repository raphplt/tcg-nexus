# Docker Setup TCG Nexus - Version Simplifiée

Ce guide vous explique comment lancer l'application TCG Nexus avec Docker.

## 🚀 Démarrage rapide (3 commandes)

```bash
# 1. Configuration
cp env.example .env

# 2. Démarrer PostgreSQL
cd apps/api
npm run docker:db

# 3. Démarrer votre API locale
npm run start:dev
```

**C'est tout !** 🎉

## 📊 Accès aux services

- **API** : http://localhost:3001
- **Documentation Swagger** : http://localhost:3001/api
- **PostgreSQL** : localhost:5432 (postgres/postgres)

## 🔧 Commandes utiles

### Gestion PostgreSQL

```bash
# Démarrer PostgreSQL
npm run docker:db

# Arrêter PostgreSQL
npm run docker:db-down

# Voir les logs PostgreSQL
npm run docker:db-logs

# Se connecter à PostgreSQL
docker-compose exec postgres psql -U postgres -d tcg_nexus
```

### Scripts de seed

```bash
# Dans votre terminal (API locale)
npm run seed
npm run seed:users
npm run seed:cardstates
```

### Alternative : Tout en Docker

```bash
# Si vous voulez dockeriser l'API aussi
docker-compose -f docker-compose-with-api.yml up
```

## 💾 Persistance des données

Vos données PostgreSQL (cartes Pokémon, utilisateurs, etc.) sont sauvegardées dans un volume Docker et survivent aux redémarrages.

## 🐛 Debug rapide

```bash
# PostgreSQL ne démarre pas ?
docker-compose ps
docker-compose logs postgres

# Port 5432 déjà utilisé ?
# Arrêtez votre PostgreSQL local ou changez le port dans .env
```

## 🧹 Nettoyage

```bash
# Supprimer PostgreSQL et toutes les données
docker-compose down -v

# Redémarrer proprement
npm run docker:db
```
