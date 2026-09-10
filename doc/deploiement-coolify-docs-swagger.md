# Déployer Docusaurus et Swagger avec Coolify et Cloudflare

Ce guide publie :

- Docusaurus sur `https://docs.tcg-nexus.org` ;
- Swagger sur `https://api.tcg-nexus.org/api/docs`.

Swagger fait partie de l'application NestJS. Il ne faut donc pas créer un
conteneur Swagger séparé : l'interface et le document OpenAPI sont générés par
la version exacte de l'API en cours d'exécution.

## 1. Préparer Cloudflare

Utiliser une seule des deux configurations suivantes selon la façon dont la VM
est exposée.

### Avec un Cloudflare Tunnel

Ajouter deux *Public Hostnames* au tunnel existant :

| Public hostname | Service d'origine |
|---|---|
| `docs.tcg-nexus.org` | `http://localhost:80` |
| `api.tcg-nexus.org` | `http://localhost:80` |

Le proxy Coolify reçoit les requêtes sur le port 80 et les route grâce au nom
d'hôte. Ne pas ajouter en parallèle des enregistrements A vers la VM pour ces
mêmes noms.

### Avec une IP publique

Créer deux enregistrements A, tous deux avec le proxy Cloudflare activé :

| Type | Nom | Cible |
|---|---|---|
| A | `docs` | IP publique de la VM |
| A | `api` | IP publique de la VM |

Dans Cloudflare, utiliser le mode SSL/TLS **Full (strict)** après émission des
certificats d'origine par Coolify. Les ports 80 et 443 de la VM doivent être
accessibles par le proxy Coolify.

## 2. Déployer Docusaurus dans Coolify

Créer une nouvelle application depuis le dépôt Git avec les paramètres
suivants :

| Paramètre Coolify | Valeur |
|---|---|
| Build Pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/apps/docs/Dockerfile` |
| Port Exposes | `3002` |
| Domain | `https://docs.tcg-nexus.org:3002` |

Le suffixe `:3002` indique le port interne du conteneur à Coolify. L'URL
publique reste une URL HTTPS standard sans port explicite.

Ajouter ces variables et conserver l'option **Build Variable** activée :

```dotenv
DOCS_URL=https://docs.tcg-nexus.org
SWAGGER_URL=https://api.tcg-nexus.org/api/docs
```

Ces valeurs sont intégrées au site statique pendant le build. Après une
modification, il faut reconstruire l'image, pas seulement redémarrer le
conteneur.

Le `Dockerfile` fournit déjà un contrôle de santé sur `/`. Ne pas configurer un
second contrôle différent dans Coolify.

## 3. Activer Swagger sur l'application API

Dans la ressource Coolify qui déploie `apps/api/Dockerfile`, ajouter la variable
de runtime suivante :

```dotenv
SWAGGER_ENABLED=true
```

Vérifier aussi les paramètres de la ressource API :

| Paramètre Coolify | Valeur |
|---|---|
| Port Exposes | `3001` |
| Domain | `https://api.tcg-nexus.org:3001` |
| Health check | `/api/health/live` sur le port `3001` |

Redéployer l'API. Swagger doit alors répondre sur `/api/docs` et le document
OpenAPI JSON sur `/api/docs-json`. En l'absence de `SWAGGER_ENABLED=true`,
Swagger reste désactivé en production.

## 4. Protéger Swagger avec Cloudflare Access

Le schéma OpenAPI révèle les routes et permet d'envoyer des requêtes depuis le
navigateur. Il est recommandé de réserver cette interface à l'équipe :

1. ouvrir **Cloudflare Zero Trust → Access → Applications** ;
2. créer une application **Self-hosted** pour
   `api.tcg-nexus.org/api/docs*` ;
3. ajouter une politique **Allow** limitée aux adresses e-mail de l'équipe ;
4. vérifier en navigation privée qu'une authentification est demandée.

Le motif `api/docs*` couvre l'interface, ses ressources statiques et
`/api/docs-json`. Ne pas protéger tout `api.tcg-nexus.org` si les routes de
l'application doivent rester publiques.

## 5. Vérifier le déploiement

Depuis une machine extérieure à la VM :

```bash
curl -fsSI https://docs.tcg-nexus.org/
curl -fsS https://api.tcg-nexus.org/api/health/live
curl -fsSI https://api.tcg-nexus.org/api/docs
```

Résultat attendu :

- la documentation répond en `200` ;
- le contrôle de santé renvoie un JSON avec `status: "ok"` ;
- Swagger répond en `200`, ou redirige vers Cloudflare Access si la protection
  est activée ;
- le bouton **Swagger API** de Docusaurus ouvre l'URL de production.

Si Coolify affiche `No available server`, vérifier en priorité le statut du
conteneur, le port interne et le contrôle de santé. Si Cloudflare renvoie une
erreur TLS 52x avec une exposition par IP publique, vérifier le certificat
Coolify et le mode **Full (strict)**.

## Documentation de référence

- [Coolify — déploiement avec un Dockerfile](https://coolify.io/docs/applications/build-packs/dockerfile)
- [Coolify — domaines](https://coolify.io/docs/knowledge-base/domains)
- [Coolify — contrôles de santé](https://coolify.io/docs/knowledge-base/health-checks)
- [Coolify — variables de build et de runtime](https://coolify.io/docs/knowledge-base/environment-variables)
- [Docusaurus — déploiement](https://docusaurus.io/docs/deployment)
- [NestJS — OpenAPI/Swagger](https://docs.nestjs.com/openapi/introduction)
- [Cloudflare — mode Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Cloudflare Access — chemins d'application](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
