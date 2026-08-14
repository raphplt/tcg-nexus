# Déploiement production — Coolify sur VM ETNA

La plateforme est déployée sur la VM ETNA via **[Coolify](https://coolify.io)** (PaaS self-hosted), qui a remplacé l'ancien déploiement par script SSH + `docker compose` manuel (conservé dans l'historique git si besoin).

## Vue d'ensemble

```
push main ──► GitHub Actions (CI : lint → tests → build)
                     │
                     ▼
              Coolify (VM ETNA) ──► containers Docker : web · api · vision · postgres · docs
                     │
                     ▼
        Cloudflare Tunnel ──► https://tcg-nexus.org / api.tcg-nexus.org / docs.tcg-nexus.org
```

Répartition des rôles :

- **GitHub Actions** (`.github/workflows/ci.yml`) : intégration continue uniquement — lint, type-check, tests unitaires avec coverage, e2e tournois sur PostgreSQL éphémère, build. Aucun déploiement.
- **Coolify** (installé sur la VM ETNA) : déploiement continu — build et redéploiement des services à chaque push sur `main`, gestion des variables d'environnement, des volumes, des logs, des health checks et des redémarrages via son dashboard web.
- **Cloudflare Tunnel** : exposition HTTPS des domaines sans IP publique ni reverse proxy à gérer.

## Services déployés

La stack correspond à `docker-compose.deploy.yml` à la racine du repo :

| Service    | Rôle                          | Port interne |
| ---------- | ----------------------------- | ------------ |
| `web`      | Front Next.js                 | 3000         |
| `api`      | API NestJS                    | 3001         |
| `vision`   | Microservice Python (scan IA) | 8000         |
| `postgres` | Base de données PostgreSQL 15 | 5432         |
| `docs`     | Documentation Docusaurus      | 3002         |

Procédure pas à pas pour livrer une nouvelle version (variables d'env, migrations, re-seed) : [mise-a-jour-prod.md](./mise-a-jour-prod.md).

## Opérations courantes (dashboard Coolify)

- **Déployer manuellement** : bouton *Deploy* sur la ressource concernée.
- **Variables d'environnement** : gérées par service dans Coolify (ne plus éditer les `.env` à la main sur la VM).
- **Logs** : visibles en temps réel par service dans le dashboard.
- **Rollback / redémarrage** : depuis le dashboard, sans passer par SSH.
- **SSH sur la VM** : réservé à l'administration (Coolify lui-même, disque, debug bas niveau).

## Points d'attention

- ⚠️ `.github/workflows/deploy.yml` contient encore l'ancien job de déploiement SSH (`docker compose up` via `appleboy/ssh-action`). Il est **obsolète** depuis le passage à Coolify : à désactiver ou supprimer pour éviter un double déploiement.
- Les sections « Déploiement VM Debian » historiques du README ont été remplacées ; ce document fait foi.

## ⚠️ Hypothèses à valider par l'équipe

Ce document a été rédigé sans accès au dashboard Coolify. Les éléments suivants décrivent le fonctionnement **standard** de Coolify et doivent être confirmés (et corrigés ici si besoin) :

- Déclenchement du déploiement sur push `main` : webhook GitHub App ou polling ?
- Stack déclarée comme ressource *Docker Compose* (`docker-compose.deploy.yml`) ou comme applications séparées ?
- Variables d'environnement effectivement gérées dans Coolify, ou toujours via fichiers `.env` sur la VM ?
- Cloudflare Tunnel : toujours actif devant Coolify, ou remplacé par le proxy intégré (Traefik/Caddy) de Coolify ?
- Rollback : disponible selon le mode de déploiement choisi (images vs build local).

## Dépannage rapide

```bash
# Sur la VM (via SSH), si le dashboard ne suffit pas :
docker ps                        # état des containers
docker logs -f <container>       # logs d'un service
df -h                            # espace disque (les builds Coolify consomment)
```
