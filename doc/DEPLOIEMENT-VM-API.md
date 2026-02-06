# Deploiement complet sur VM ETNA (Docker: Front + API + PostgreSQL + Cloudflare)

Ce guide deploie toute la plateforme sur la VM:
- Front Next.js (container `web`, port `3000`)
- API NestJS (container `api`, port `3001`)
- PostgreSQL (container `postgres`, port `5432`)
- Cloudflare Tunnel pour exposer `tcg-nexus.org` et `api.tcg-nexus.org` avec URL stable

Le tout est orchestre par `docker-compose.deploy.yml`.

---

## 1. Prerequis

Sur la VM:
- Docker + Docker Compose plugin
- Git
- Domaine sur Cloudflare (zone active)
- `cloudflared` installe

---

## 2. Recuperer le repo

```bash
sudo mkdir -p /srv
sudo chown -R $USER:$USER /srv
cd /srv
git clone https://github.com/raphplt/tcg-nexus /srv/tcg-nexus
cd /srv/tcg-nexus
```

---

## 3. Variables d'environnement

### 3.1 `.env` racine (utilise par Docker Compose)

Creer `/srv/tcg-nexus/.env`:

```env
DATABASE_NAME=tcg_nexus
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

JWT_SECRET=remplace_par_une_valeur_longue_et_aleatoire
JWT_REFRESH_SECRET=remplace_par_une_valeur_longue_et_aleatoire
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Notes:
- Dans ce mode Docker, l'API parle a la DB via `DATABASE_HOST=postgres` (injecte par Compose).
- `NODE_ENV` de l'API reste en `development` dans Compose pour eviter SSL Postgres force dans ce repo.

### 3.2 Front env (optionnel)

Pas obligatoire ici: `NEXT_PUBLIC_API_URL=/api` est deja injecte au runtime du container `web`.

---

## 4. Demarrer la stack Docker

Depuis `/srv/tcg-nexus`:

```bash
docker compose -f docker-compose.deploy.yml up -d --build
```

Verifier:
```bash
docker compose -f docker-compose.deploy.yml ps
docker compose -f docker-compose.deploy.yml logs -f postgres
docker compose -f docker-compose.deploy.yml logs -f api
docker compose -f docker-compose.deploy.yml logs -f web
```

Test local VM:
```bash
curl -I http://127.0.0.1:3000
curl -i http://127.0.0.1:3001/
```

---

## 5. Seeder la base (dans le container API)

Le script de seed interactif est plus simple avec `exec`:

```bash
docker compose -f docker-compose.deploy.yml exec api npm run seed
```

Si tu veux un seed non interactif:
```bash
docker compose -f docker-compose.deploy.yml exec -e SEED_AUTO_CONFIRM=true api npm run seed:prod
```

---

## 6. Cloudflare Tunnel (URL stable)

Tu as deja cree le tunnel `tcg-nexus-main`.

### 6.1 Config `/etc/cloudflared/config.yml`

```yaml
tunnel: 6159185a-d6c9-4d07-aa32-507dc003ed32
credentials-file: /root/.cloudflared/6159185a-d6c9-4d07-aa32-507dc003ed32.json

ingress:
  - hostname: tcg-nexus.org
    path: /api/*
    service: http://localhost:3001
  - hostname: www.tcg-nexus.org
    path: /api/*
    service: http://localhost:3001
  - hostname: api.tcg-nexus.org
    service: http://localhost:3001
  - hostname: tcg-nexus.org
    service: http://localhost:3000
  - hostname: www.tcg-nexus.org
    service: http://localhost:3000
  - service: http_status:404
```

### 6.2 DNS routes

Si un record existe deja pour `@` ou `www`, supprime-le d'abord dans Cloudflare DNS, puis:

```bash
sudo cloudflared tunnel route dns tcg-nexus-main tcg-nexus.org
sudo cloudflared tunnel route dns tcg-nexus-main www.tcg-nexus.org
sudo cloudflared tunnel route dns tcg-nexus-main api.tcg-nexus.org
```

### 6.3 Service systemd cloudflared

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager
```

Logs:
```bash
journalctl -u cloudflared -f
```

---

## 7. Verifications finales

Depuis la VM:
```bash
curl -I http://127.0.0.1:3000
curl -i http://127.0.0.1:3001/
```

Depuis ton poste:
```bash
curl -I https://tcg-nexus.org
curl -i https://tcg-nexus.org/api/
curl -i https://api.tcg-nexus.org/
```

Checklist:
- `https://tcg-nexus.org` charge le front
- les appels `/api/*` passent
- login/register fonctionne
- pas d'erreurs CORS

---

## 8. Mise a jour applicative

```bash
cd /srv/tcg-nexus
git pull
docker compose -f docker-compose.deploy.yml up -d --build
```

Si reseed necessaire:
```bash
docker compose -f docker-compose.deploy.yml exec api npm run seed
```

---

## 9. Commandes utiles

Arreter:
```bash
docker compose -f docker-compose.deploy.yml down
```

Arreter + supprimer volumes DB (destructif):
```bash
docker compose -f docker-compose.deploy.yml down -v
```

Redemarrer un service:
```bash
docker compose -f docker-compose.deploy.yml restart api
docker compose -f docker-compose.deploy.yml restart web
```

---

## 10. Fichiers ajoutes pour ce mode

- `docker-compose.deploy.yml`
- `docker/api.Dockerfile`
- `docker/web.Dockerfile`
- `.dockerignore`

