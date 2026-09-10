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

| Nom | Affichage DNS | Tunnel | État attendu |
|---|---|---|---|
| `api.tcg-nexus.org` | Tunnel | `tcg-nexus-main` | déjà présent |
| `docs.tcg-nexus.org` | Tunnel | `tcg-nexus-main` | à créer |

### Pourquoi ne pas créer un enregistrement A ?

`docs` est le nom du sous-domaine ; `A` serait le type d'enregistrement DNS.
Un enregistrement A doit contenir une IPv4 que Cloudflare peut joindre depuis
Internet. Ce n'est pas adapté ici, car la VM est derrière un VPN et n'expose
pas d'IPv4 publique directement accessible.

Cloudflare Tunnel fonctionne dans le sens inverse : `cloudflared`, exécuté sur
la VM, ouvre une connexion **sortante** vers Cloudflare. Aucun accès entrant à
la VM à travers le VPN n'est nécessaire. Le chemin d'une requête est donc :

```text
Navigateur → Cloudflare → tcg-nexus-main → localhost:3002 → conteneur docs
```

Il ne faut pas enregistrer l'écran DNS de type A montré dans la capture.

### Ajouter la route Docusaurus

**Tunnel n'est pas un type sélectionnable dans le formulaire DNS.** Cloudflare
utilise ce libellé dans la liste DNS pour représenter une route créée et gérée
par Cloudflare Tunnel. Il ne faut donc pas utiliser le bouton **Add record** de
la page DNS pour cette opération.

Créer la route depuis le tunnel :

1. ouvrir **Cloudflare → Networking → Tunnels** ;
2. sélectionner `tcg-nexus-main` ;
3. ouvrir l'onglet **Routes** ;
4. cliquer sur **Add route**, puis choisir **Published application** ;
5. saisir `docs` comme sous-domaine et `tcg-nexus.org` comme domaine ;
6. laisser **Path** vide ;
7. saisir `http://localhost:3002` dans **Service URL** ;
8. cliquer sur **Add route**.

### Service URL confirmé par la configuration existante

La capture des routes `tcg-nexus-main` confirme que le tunnel cible directement
les ports publiés sur la VM :

| Route existante | Service URL |
|---|---|
| `api.tcg-nexus.org` | `http://localhost:3001` |
| `tcg-nexus.org` | `http://localhost:3000` |
| `www.tcg-nexus.org` | `http://localhost:3000` |
| `coolify.tcg-nexus.org` | `http://localhost:8000` |

Le fichier `docker-compose.deploy.yml` publie le service `docs` sur le port
`3002`. Le Service URL correspondant est donc `http://localhost:3002`.
Après le redéploiement Coolify et avant d'ajouter la route Cloudflare, il est
possible de le confirmer depuis la VM :

```bash
curl -I http://127.0.0.1:3002/
```

Une réponse `200 OK` confirme que le service est prêt. Comme les routes
existantes emploient déjà `localhost`, le connecteur `cloudflared` accède bien
aux ports de cette VM malgré son placement derrière le VPN.

Le résultat doit être identique à la ligne `api.tcg-nexus.org` : type
**Tunnel**, contenu `tcg-nexus-main`, statut **Proxied** et TTL **Auto**.

| Public hostname | Service d'origine |
|---|---|
| `docs.tcg-nexus.org` | `http://localhost:3002` |

L'ajout de cette *Published application route* crée et gère l'entrée DNS
correspondante. La page DNS l'affiche alors avec le type **Tunnel** même si ce
type n'apparaît pas dans la liste du formulaire DNS standard.

Le port 3002 n'a pas besoin d'être accessible depuis Internet. Il doit
uniquement être joignable localement par `cloudflared` ; le tunnel transporte
ensuite la requête par sa connexion sortante.

## 2. Déployer Docusaurus dans Coolify

**Ne pas créer une nouvelle application Coolify.** La ressource TCG Nexus
existante utilise déjà le Build Pack **Docker Compose** et charge
`/docker-compose.deploy.yml`. Ce fichier contient le service `docs` et référence
lui-même le Dockerfile :

```yaml
docs:
  build:
    context: .
    dockerfile: apps/docs/Dockerfile
```

Il n'existe donc aucun champ où saisir `/apps/docs/Dockerfile` dans Coolify :
fermer l'écran **Create a new Application** montré dans la capture.

Dans la ressource TCG Nexus existante, conserver les paramètres visibles :

| Paramètre Coolify | Valeur |
|---|---|
| Build Pack | `Docker Compose` |
| Base Directory | `/` |
| Docker Compose Location | `/docker-compose.deploy.yml` |
| Domains for docs | `http://docs.tcg-nexus.org` |

Dans **Environment Variables**, ajouter ou vérifier :

```dotenv
DOCS_URL=https://docs.tcg-nexus.org
SWAGGER_URL=https://api.tcg-nexus.org/api/docs
SWAGGER_ENABLED=true
```

`DOCS_URL` et `SWAGGER_URL` doivent être disponibles pendant le build.
`SWAGGER_ENABLED` doit être disponible au runtime.

Après avoir poussé les commits sur la branche suivie par Coolify :

1. ouvrir la ressource TCG Nexus existante ;
2. cliquer sur **Reload Compose File** si Coolify n'affiche pas les dernières
   modifications du fichier ;
3. vérifier que **Domains for docs** contient `http://docs.tcg-nexus.org` ;
4. enregistrer, puis cliquer sur **Redeploy** ;
5. vérifier dans les logs que le service `docs` démarre et devient sain ;
6. seulement ensuite, ajouter la route Cloudflare vers
   `http://localhost:3002`.

## 3. Activer Swagger sur l'application API

Dans les variables d'environnement de cette même ressource Docker Compose,
ajouter la variable de runtime suivante :

```dotenv
SWAGGER_ENABLED=true
```

Vérifier aussi les paramètres affichés pour le service API :

| Paramètre Coolify | Valeur |
|---|---|
| Port publié par Compose | `3001` |
| Domains for api | `http://api.tcg-nexus.org` |
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
route d'origine cible le Service URL vérifié ci-dessus.

## Documentation de référence

- [Coolify — déploiement avec Docker Compose](https://coolify.io/docs/applications/build-packs/docker-compose)
- [Coolify — domaines](https://coolify.io/docs/knowledge-base/domains)
- [Coolify — contrôles de santé](https://coolify.io/docs/knowledge-base/health-checks)
- [Coolify — variables de build et de runtime](https://coolify.io/docs/knowledge-base/environment-variables)
- [Docusaurus — déploiement](https://docusaurus.io/docs/deployment)
- [NestJS — OpenAPI/Swagger](https://docs.nestjs.com/openapi/introduction)
- [Cloudflare — publier une application avec Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/)
- [Cloudflare — créer une route Published application](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/#2a-publish-an-application)
- [Cloudflare Access — chemins d'application](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
