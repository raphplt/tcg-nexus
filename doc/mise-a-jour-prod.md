# Mise à jour de la production

Procédure complète pour déployer une nouvelle version sur la VM ETNA : variables
d'environnement, migrations de schéma, re-seed du catalogue.

Le contexte d'infrastructure (Coolify, Cloudflare Tunnel, services) est décrit
dans [deploiement-vm.md](./deploiement-vm.md).

- **Dashboard Coolify** : http://172.16.248.55:8000
- **SSH VM** : `ssh plassa_r@172.16.248.55`, projet dans `/srv/tcg-nexus`

---

## 1. Variables d'environnement

À vérifier dans Coolify **avant** de déployer. Les valeurs sensibles ne sont pas
reproduites ici : elles vivent uniquement dans le dashboard.

### Requises côté API

| Variable | Valeur | Rôle |
|---|---|---|
| `DATABASE_HOST` | `postgres` | nom du service dans le réseau Docker |
| `DATABASE_NAME` / `DATABASE_USER` / `DATABASE_PASSWORD` | — | accès Postgres |
| `DATABASE_SSL` | `false` | Postgres est en réseau interne, pas de TLS |
| `DATABASE_MIGRATIONS_RUN` | `true` | applique les migrations au démarrage |
| `NODE_ENV` | `production` | désactive `synchronize` et l'endpoint de seed |
| `FRONTEND_URL` | `https://tcg-nexus.org` | origine de référence CORS **et** CSRF |
| `COOKIE_DOMAIN` | `tcg-nexus.org` | cookies partagés avec `api.` |
| `COOKIE_SAMESITE` | `lax` | web et API sont same-site |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | — | signature des tokens |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` | durées de vie |
| `VISION_SERVICE_URL` | `http://vision:8000` | microservice de scan |
| `R2_*` | — | stockage des images (Cloudflare R2) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | paiement (clés de test) |
| `ALLOW_DEMO_SEED` | `true` | autorise le seed de démo en prod (voir §4) |

`FRONTEND_URL` doit être en **https** : le middleware CSRF compare l'`Origin`
reçue à cette chaîne exacte (`csrf-origin.middleware.ts`), un `http://` ferait
échouer toutes les écritures authentifiées en 403.

### Requises côté web

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` |
| `API_INTERNAL_URL` | `http://api:3001/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://tcg-nexus.org` |
| `NEXT_PUBLIC_SEALED_CDN_URL` | `https://cdn.tcg-nexus.org` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | — |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | — |

### À ne pas définir

- `SEED_ENABLED` — le contrôleur HTTP `/seed` n'est pas chargé en prod
  (`seed.module.ts`), c'est voulu. Le seed passe par la CLI (§4).
- `DATABASE_SYNCHRONIZE` — sans effet en production, ignoré par `app.module.ts`.
- `DATABASE_SSL_REJECT_UNAUTHORIZED` / `DATABASE_SSL_CA` — sans effet tant que
  `DATABASE_SSL=false`.

### Limite connue du build web

`apps/web/Dockerfile` ne déclare aucun `ARG` : les variables `NEXT_PUBLIC_*` de
Coolify ne sont pas présentes pendant `npm run build`, alors que Next.js les
inline à ce moment-là pour le code client. Les usages côté serveur (sitemap,
métadonnées) fonctionnent au runtime, mais un composant client (Stripe, Google
Maps) peut recevoir `undefined`.

> NOTE: correctif si le symptôme apparaît — déclarer les `ARG`/`ENV` dans
> `apps/web/Dockerfile` et un bloc `build.args` dans `docker-compose.deploy.yml`.

---

## 2. Déclencher le déploiement

```bash
git checkout main && git merge <branche> && git push
```

Coolify rebuild et redéploie sur push `main`. Sinon, bouton **Deploy** sur la
ressource dans le dashboard.

---

## 3. Migrations de schéma

`synchronize` est désactivé en production : le schéma n'évolue que par
migrations TypeORM.

**Automatique (recommandé)** — avec `DATABASE_MIGRATIONS_RUN=true`, chaque
redéploiement applique les migrations en attente au démarrage de l'API.

**Manuel** — en SSH sur la VM :

```bash
docker ps                                              # nom réel du conteneur API
docker exec -it tcg-nexus-api npm run migration:show   # état actuel
docker exec -it tcg-nexus-api npm run migration:run
```

L'image embarque `src/` et les devDependencies, la CLI TypeORM y fonctionne.

> ⚠️ Il n'existe pas de migration de baseline : la base de prod a été créée par
> `synchronize`. Les migrations sont écrites en défensif (`ADD COLUMN IF NOT
> EXISTS`, rattrapage de `duplicate_object`) et passent sur les deux cas, mais
> il faut lire la sortie de `migration:show` avant de lancer `migration:run`.
> Détails dans [migrations.md](./migrations.md).

---

## 4. Re-seed du catalogue

### Sauvegarde obligatoire au préalable

`npm run seed:prod` force `SEED_AUTO_CONFIRM=true`, ce qui répond « oui » à la
demande de suppression et exécute un `TRUNCATE ... RESTART IDENTITY CASCADE` sur
`card`, `pokemon_set`, `pokemon_serie`, `tournament`, `match`, `article`, `faq`
et `"user"`. Le `CASCADE` sur `"user"` emporte **tous les comptes, collections,
listings, decks et commandes**. Aucune confirmation interactive n'est possible.

```bash
docker exec tcg-nexus-postgres pg_dump -U postgres tcg_nexus \
  | gzip > ~/backup-tcg-$(date +%F-%H%M).sql.gz
ls -lh ~/backup-tcg-*.sql.gz
```

Restauration :

```bash
gunzip -c ~/backup-tcg-XXXX.sql.gz \
  | docker exec -i tcg-nexus-postgres psql -U postgres tcg_nexus
```

### Lancer le seed

À faire **après** les migrations, pour que le schéma soit à jour :

```bash
docker exec -it tcg-nexus-api npm run seed:prod
```

Enchaînement : truncate → utilisateurs de démo → CardStates → tournois → FAQ →
articles → catalogue Pokémon complet (séries, sets, cartes, traductions) → sync
des effets parsés → listings → produits scellés → decks → tournoi de
démonstration. Compter plusieurs minutes sur l'import du catalogue.

Le catalogue est lu depuis `/app/data` (embarqué dans l'image via
`TCG_DATA_DIR`) : aucun transfert de fichiers vers la VM n'est nécessaire.

`ALLOW_DEMO_SEED=true` est indispensable — sans lui, `seedUsers()`,
`seedTournaments()` et les autres seeds de démo se court-circuitent en
production et la base ressort vide de contenu de démonstration.

### Alternative non destructive

Pour rafraîchir les métadonnées sans toucher aux données :

```bash
docker exec -it tcg-nexus-api npm run sync:db-metadata:prod
```

---

## 5. Vérifications

```bash
docker ps                          # tous les services Up / healthy
docker logs -f tcg-nexus-api       # aucune erreur TypeORM au démarrage
docker logs -f tcg-nexus-web
```

Puis dans le navigateur :

- https://tcg-nexus.org — liste de cartes, images chargées
- connexion avec un compte de seed
- une fiche tournoi et une page marketplace
- https://api.tcg-nexus.org/api — Swagger
- https://docs.tcg-nexus.org — documentation

---

## Récapitulatif

```bash
# 1. Vérifier les variables d'env dans Coolify (§1)
# 2. Pousser sur main → Coolify redéploie
# 3. En SSH sur la VM :
docker exec -it tcg-nexus-api npm run migration:show
docker exec -it tcg-nexus-api npm run migration:run
docker exec tcg-nexus-postgres pg_dump -U postgres tcg_nexus | gzip > ~/backup-tcg-$(date +%F-%H%M).sql.gz
docker exec -it tcg-nexus-api npm run seed:prod          # DESTRUCTIF
docker logs -f tcg-nexus-api
```
