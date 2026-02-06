# Deploiement complet sur VM ETNA (Front + API + PostgreSQL + Cloudflare)

Ce guide migre ton projet de Vercel vers la VM ETNA pour servir:
- Front Next.js sur `https://tcg-nexus.org`
- API NestJS sur `https://tcg-nexus.org/api` (et optionnellement `https://api.tcg-nexus.org`)
- Base PostgreSQL en Docker sur la VM

Objectif:
- Une URL stable
- Pas de GHCR / pas de CI-CD obligatoire
- Deploiement manuel, simple, reproductible

---

## 1. Architecture cible

- VM ETNA (IP privee `172.16.x.x`)
  - Front Next.js: `localhost:3000`
  - API NestJS: `localhost:3001`
  - PostgreSQL Docker: `localhost:5432`
- Cloudflare Tunnel nomme (sortant depuis la VM)
  - `tcg-nexus.org` -> Front
  - `tcg-nexus.org/api/*` -> API
  - `api.tcg-nexus.org` -> API (optionnel, pratique pour debug)

Pourquoi ce schema:
- Evite l'exposition directe de la VM
- Evite les problemes CORS en production via `/api` sur le meme domaine

---

## 2. Prerequis

Sur la VM:
- Docker + Docker Compose plugin
- Git
- Node.js 20 LTS recommande (important pour Next 16)
- npm

Cote DNS:
- Domaine achete (`tcg-nexus.org`)
- Compte Cloudflare

---

## 3. Basculer le DNS Namecheap vers Cloudflare

1. Ajoute `tcg-nexus.org` dans Cloudflare.
2. Recupere les 2 nameservers Cloudflare.
3. Dans Namecheap > Domain > Nameservers:
   - passe de `Namecheap BasicDNS` a `Custom DNS`
   - colle les 2 nameservers Cloudflare
4. Attends la propagation.

Verification:
```bash
dig NS tcg-nexus.org +short
```

---

## 4. Recuperer le repo sur la VM

```bash
sudo mkdir -p /srv
sudo chown -R $USER:$USER /srv
cd /srv
git clone https://github.com/raphplt/tcg-nexus /srv/tcg-nexus
cd /srv/tcg-nexus
```

Si tu as un dossier existant et veux repartir de zero:
```bash
sudo rm -rf /srv/tcg-nexus
git clone https://github.com/raphplt/tcg-nexus /srv/tcg-nexus
```

---

## 5. Postgres sur la VM

Configurer le `.env` racine:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tcg_nexus
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

Lancer PostgreSQL:
```bash
cd /srv/tcg-nexus
docker compose up -d postgres
docker compose ps
docker compose logs -f postgres
```

---

## 6. Configuration API (`apps/api/.env`)

Creer `/srv/tcg-nexus/apps/api/.env`:

```env
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=tcg_nexus
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

JWT_SECRET=remplace_par_une_valeur_longue_et_aleatoire
JWT_REFRESH_SECRET=remplace_par_une_valeur_longue_et_aleatoire
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

PORT=3001
NODE_ENV=development
FRONTEND_URL=https://tcg-nexus.org
```

Notes:
- `JWT_SECRET` et `JWT_REFRESH_SECRET` sont obligatoires.
- Dans ce repo, `NODE_ENV=production` active SSL DB dans TypeORM. Avec Postgres local Docker sans SSL, garde `NODE_ENV=development` tant que ce point n'est pas adapte dans le code.

---

## 7. Configuration Front (`apps/web/.env.production`)

Creer `/srv/tcg-nexus/apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL=/api
```

Pourquoi:
- Le front appelle l'API sur le meme domaine (`/api`), via le tunnel.
- Pas besoin de rewrite Vercel.

---

## 8. Build et lancement manuel (premier demarrage)

Installer deps (workspace), build API + web:

```bash
cd /srv/tcg-nexus
npm ci

cd /srv/tcg-nexus/apps/api
npm run build
npm run seed

cd /srv/tcg-nexus/apps/web
npm run build
```

Test manuel local VM:

Terminal 1:
```bash
cd /srv/tcg-nexus/apps/api
npm run start:prod
```

Terminal 2:
```bash
cd /srv/tcg-nexus/apps/web
npm run start -- --hostname 0.0.0.0 --port 3000
```

Terminal 3:
```bash
curl -i http://127.0.0.1:3001/
curl -I http://127.0.0.1:3000/
```

---

## 9. Installer Cloudflare Tunnel nomme (URL stable)

### 9.1 Installer `cloudflared`

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared bookworm main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update
sudo apt install -y cloudflared
cloudflared --version
```

### 9.2 Login + creation tunnel

```bash
sudo cloudflared tunnel login
sudo cloudflared tunnel create tcg-nexus-main
sudo cloudflared tunnel list
```

### 9.3 Config tunnel

Creer `/etc/cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

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

Si le tunnel a ete cree sans `sudo`, adapte `credentials-file` vers:
`/home/plassa_r/.cloudflared/<TUNNEL_UUID>.json`

### 9.4 DNS Cloudflare vers le tunnel

```bash
sudo cloudflared tunnel route dns tcg-nexus-main tcg-nexus.org
sudo cloudflared tunnel route dns tcg-nexus-main www.tcg-nexus.org
sudo cloudflared tunnel route dns tcg-nexus-main api.tcg-nexus.org
```

### 9.5 Service systemd cloudflared

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

## 10. Services systemd pour API et Front

### 10.1 API service

Creer `/etc/systemd/system/tcg-api.service`:

```ini
[Unit]
Description=TCG Nexus API (NestJS)
After=network.target docker.service

[Service]
Type=simple
User=plassa_r
WorkingDirectory=/srv/tcg-nexus/apps/api
Environment=NODE_ENV=development
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 10.2 Front service

Creer `/etc/systemd/system/tcg-web.service`:

```ini
[Unit]
Description=TCG Nexus Web (Next.js)
After=network.target tcg-api.service

[Service]
Type=simple
User=plassa_r
WorkingDirectory=/srv/tcg-nexus/apps/web
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=/api
ExecStart=/usr/bin/npm run start -- --hostname 0.0.0.0 --port 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 10.3 Activation

```bash
sudo systemctl daemon-reload
sudo systemctl enable tcg-api tcg-web
sudo systemctl restart tcg-api tcg-web
sudo systemctl status tcg-api --no-pager
sudo systemctl status tcg-web --no-pager
```

Logs:
```bash
journalctl -u tcg-api -f
journalctl -u tcg-web -f
```

---

## 11. Couper la dependance Vercel (migration)

1. Dans le repo, `apps/web/vercel.json` n'est plus necessaire pour la prod VM.
2. Le trafic principal doit pointer vers `tcg-nexus.org` (Cloudflare Tunnel).
3. Tu peux garder Vercel temporairement comme backup le temps de valider.

---

## 12. Verification finale

Depuis ton poste:

```bash
curl -I https://tcg-nexus.org
curl -i https://tcg-nexus.org/api/
curl -i https://api.tcg-nexus.org/
```

Checklist navigateur:
- `https://tcg-nexus.org` charge bien
- les appels XHR vers `/api/*` repondent
- login/register fonctionne
- pas d'erreur CORS

---

## 13. Routine de mise a jour manuelle

```bash
cd /srv/tcg-nexus
git pull
npm ci

cd /srv/tcg-nexus/apps/api
npm run build

cd /srv/tcg-nexus/apps/web
npm run build

sudo systemctl restart tcg-api tcg-web
```

Si reseed necessaire:
```bash
cd /srv/tcg-nexus/apps/api
npm run seed
sudo systemctl restart tcg-api
```

---

## 14. References

- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- DNS routing tunnel: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/
- Ingress rules tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/local-management/configuration-file/
- Next.js deployment: https://nextjs.org/docs/app/building-your-application/deploying
