# Déployer Docusaurus et Swagger avec Coolify et Cloudflare

Ce guide publie :

- Docusaurus sur `https://docs.tcg-nexus.org` ;
- Swagger sur `https://api.tcg-nexus.org/api/docs`.

Swagger fait partie de l'application NestJS. Il ne faut donc pas créer un
conteneur Swagger séparé : l'interface et le document OpenAPI sont générés par
la version exacte de l'API en cours d'exécution.

## 1. Routage Cloudflare utilisé par le projet

La zone `tcg-nexus.org` utilise le tunnel Cloudflare `tcg-nexus-main`. Les
routes `api.tcg-nexus.org`, `coolify.tcg-nexus.org`, `tcg-nexus.org` et
`www.tcg-nexus.org` apparaissent déjà comme des enregistrements de type
**Tunnel**, avec le statut **Proxied**.

L'enregistrement `api.tcg-nexus.org` est donc déjà prêt pour Swagger. Il ne faut
créer ni `swagger.tcg-nexus.org`, ni nouvel enregistrement pour l'API. Seule la
route de la documentation manque :

| Nom | Type | Tunnel | État attendu |
|---|---|---|---|
| `api.tcg-nexus.org` | Tunnel | `tcg-nexus-main` | déjà présent |
| `docs.tcg-nexus.org` | Tunnel | `tcg-nexus-main` | à créer |

### Ajouter la route Docusaurus

Si les routes sont gérées depuis la page DNS montrée dans la capture :

1. ouvrir **Cloudflare → tcg-nexus.org → DNS → Records** ;
2. cliquer sur **Add record** ;
3. sélectionner le type **Tunnel** ;
4. saisir `docs` comme nom ;
5. sélectionner `tcg-nexus-main` comme tunnel, puis enregistrer.

Le résultat doit être identique à la ligne `api.tcg-nexus.org` : type
**Tunnel**, contenu `tcg-nexus-main`, statut **Proxied** et TTL **Auto**.

Si le tunnel utilise aussi des règles *Published application routes*, ajouter
ou vérifier la règle suivante :

| Public hostname | Service d'origine |
|---|---|
| `docs.tcg-nexus.org` | `http://localhost:80` |

Quand le *Public Hostname* est créé depuis la configuration du tunnel,
Cloudflare peut créer automatiquement l'enregistrement DNS correspondant. Dans
ce cas, ne pas le créer une deuxième fois depuis la page DNS.

Le tunnel doit cibler le proxy Coolify sur `localhost:80`, et non directement
les ports `3001` ou `3002`. Coolify reçoit le nom d'hôte original et choisit le
bon conteneur : `api.tcg-nexus.org` vers l'API et `docs.tcg-nexus.org` vers
Docusaurus. Aucun port applicatif ni adresse IP publique de la VM n'a besoin
d'être exposé dans Cloudflare.

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
conteneur, le port interne et le contrôle de santé. Si Cloudflare affiche une
erreur 502 ou 503, vérifier ensuite que `tcg-nexus-main` est connecté et que sa
route d'origine cible bien `http://localhost:80`.

## Documentation de référence

- [Coolify — déploiement avec un Dockerfile](https://coolify.io/docs/applications/build-packs/dockerfile)
- [Coolify — domaines](https://coolify.io/docs/knowledge-base/domains)
- [Coolify — contrôles de santé](https://coolify.io/docs/knowledge-base/health-checks)
- [Coolify — variables de build et de runtime](https://coolify.io/docs/knowledge-base/environment-variables)
- [Docusaurus — déploiement](https://docusaurus.io/docs/deployment)
- [NestJS — OpenAPI/Swagger](https://docs.nestjs.com/openapi/introduction)
- [Cloudflare — publier une application avec Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/)
- [Cloudflare Access — chemins d'application](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
