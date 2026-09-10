---
title: Déploiement en Production & Cloudflare
---

Cette section documente l'infrastructure de production de **TCG Nexus**, son déploiement via **Coolify**, la topologie de réseau sécurisée par **Cloudflare Tunnel**, ainsi que les procédures de mise à jour en production.

---

## 1. Architecture d'hébergement & Topologie réseau

L'infrastructure complète de production est hébergée sur une machine virtuelle Linux (VM) placée derrière un réseau privé virtuel (VPN).

```
                      INTERNET / UTILISATEURS
                                │
                                ▼
                       CLOUDFLARE EDGE
                   (DNS, SSL, DDoS, Access)
                                │
                                ▼  Connexion sortante chiffrée
                       Cloudflare Tunnel
                     (`tcg-nexus-main`)
                                │
                        ┌───────┴───────┐
                        │ VM LINUX ETNA │
                        └───────┬───────┘
                                │
              DOCKER COMPOSE (`docker-compose.deploy.yml`)
  ┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
  │     API      │     WEB      │     DOCS     │    VISION    │   POSTGRES   │
  │  port 3001   │  port 3000   │  port 3002   │  port 8000   │  port 5432   │
  │ (NestJS)     │  (Next.js)   │ (Docusaurus) │ (Python OCR) │ (+ pgvector) │
  └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### Pourquoi Cloudflare Tunnel ?
La machine virtuelle n'expose pas d'adresse IPv4 publique directe accessible depuis Internet en raison du VPN d'infrastructure. Le démon `cloudflared` installé sur la machine ouvre une **connexion sortante sécurisée** vers le réseau mondial de Cloudflare :
- **Aucun port entrant n'a besoin d'être ouvert** sur le pare-feu ou le routeur ;
- Le trafic extérieur est filtré, protégé contre les attaques DDoS et servi sous certificats SSL automatiques ;
- Le routage local dirige chaque nom de domaine vers le port du conteneur adéquat sur la VM.

### Table de routage Cloudflare Tunnel (`tcg-nexus-main`)

| Nom d'hôte public | Service URL d'origine | Rôle |
|---|---|---|
| `tcg-nexus.org` | `http://localhost:3000` | Application Web Next.js |
| `www.tcg-nexus.org` | `http://localhost:3000` | Redirection / alias Web |
| `api.tcg-nexus.org` | `http://localhost:3001` | API NestJS backend |
| `docs.tcg-nexus.org` | `http://localhost:3002` | Documentation Docusaurus |
| `coolify.tcg-nexus.org` | `http://localhost:8000` | Console de gestion Coolify |

---

## 2. Déploiement avec Coolify

Le déploiement est orchestré par le moteur PaaS auto-hébergé **Coolify** à l'aide de la pile `docker-compose.deploy.yml`.

### Configuration des services dans Coolify
- **Build Pack** : `Docker Compose`
- **Compose Location** : `/docker-compose.deploy.yml`
- **Base Directory** : `/`

### Documentation Docusaurus en production
Le service Docusaurus est publié sur le port **3002** pour éviter toute collision avec le front Next.js (port 3000). Les variables de build requises sont :
```dotenv
DOCS_URL=https://docs.tcg-nexus.org
SWAGGER_URL=https://api.tcg-nexus.org/api/docs
```

### Swagger API en production
L'interface OpenAPI Swagger est embarquée directement dans l'API NestJS (route `/api/docs`). Elle s'active en production via :
```dotenv
SWAGGER_ENABLED=true
```
Pour éviter d'exposer la surface d'exploration des endpoints au grand public, cette URL est protégée par une politique **Cloudflare Zero Trust Access** restreinte aux adresses e-mail de l'équipe sur le motif d'URL `api.tcg-nexus.org/api/docs*`.

---

## 3. Procédure de mise à jour en production

### Étape 1 : Déploiement du code
1. Fusionner les modifications sur la branche `main` et pousser le commit :
   ```bash
   git checkout main && git merge <ma-branche> && git push origin main
   ```
2. Dans la console Coolify, ouvrir la ressource TCG Nexus et cliquer sur **Redeploy**.

### Étape 2 : Migrations de schéma TypeORM
En production, `synchronize` est formellement désactivé. La variable `DATABASE_MIGRATIONS_RUN=true` applique automatiquement les migrations en attente au démarrage du conteneur API.

Pour vérifier ou appliquer manuellement en SSH sur la VM :
```bash
# Vérifier les migrations en attente
docker exec -it tcg-nexus-api npm run migration:show

# Appliquer les migrations
docker exec -it tcg-nexus-api npm run migration:run
```

### Étape 3 : Re-seed du catalogue (si nécessaire)

> [!CAUTION]
> Le script `npm run seed:prod` effectue un `TRUNCATE ... CASCADE` sur les tables du catalogue et des utilisateurs. Sauvegardez **impérativement** la base au préalable !

```bash
# Sauvegarde de précaution
docker exec tcg-nexus-postgres pg_dump -U postgres tcg_nexus | gzip > ~/backup-tcg-$(date +%F-%H%M).sql.gz

# Lancement du seed de production (nécessite ALLOW_DEMO_SEED=true)
docker exec -it tcg-nexus-api npm run seed:prod
```

Pour un rafraîchissement non destructif des métadonnées uniquement :
```bash
docker exec -it tcg-nexus-api npm run sync:db-metadata:prod
```

### Étape 4 : Vérification de santé du système
Tester les sondes de disponibilité depuis une machine extérieure :
```bash
# Documentation Docusaurus
curl -fsSI https://docs.tcg-nexus.org/

# Contrôle de santé API (Liveness & Database)
curl -fsS https://api.tcg-nexus.org/api/health/live

# Documentation interactive Swagger
curl -fsSI https://api.tcg-nexus.org/api/docs
```
Un code de réponse `200 OK` confirme le bon fonctionnement du routage Cloudflare Tunnel et des conteneurs applicatifs.
