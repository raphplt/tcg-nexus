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
Navigateur → Cloudflare → tcg-nexus-main → service local vérifié → conteneur
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
6. saisir l'URL locale vérifiée dans **Service URL** ;
7. cliquer sur **Add route**.

### Déterminer le Service URL avec certitude

Ouvrir la route existante `api.tcg-nexus.org` dans `tcg-nexus-main` et relever
son **Service URL**. Cela indique comment l'installation actuelle est routée :

- si l'API utilise `http://localhost:3001`, le tunnel cible directement les
  ports publiés sur la VM ;
- si l'API utilise `http://localhost:80`, le tunnel passe par le proxy Coolify.
  Coolify sélectionne ensuite le conteneur à partir du nom d'hôte ;
- si l'API utilise une adresse VPN, `cloudflared` tourne probablement sur une
  autre machine du VPN ou utilise explicitement l'interface VPN.

Le déploiement Docusaurus recommandé dans ce guide est une application Coolify
avec un domaine et un port interne `3002`. Dans cette configuration, commencer
par tester le proxy Coolify sur le port 80. Depuis une session SSH ouverte à
travers le VPN :

```bash
curl -I -H 'Host: docs.tcg-nexus.org' http://127.0.0.1:80/
```

Une réponse HTTP de Coolify (`200`, `301` ou `302`) confirme que le **Service
URL** doit être `http://localhost:80`. Si cette requête échoue et que le projet
est déployé avec `docker-compose.deploy.yml`, tester le port publié directement :

```bash
curl -I http://127.0.0.1:3002/
```

Une réponse Docusaurus en `200` confirme alors
`http://localhost:3002`. Ne créer la route Cloudflare qu'après avoir obtenu une
réponse avec l'un de ces deux tests.

Le mot `localhost` désigne la machine sur laquelle le connecteur `cloudflared`
s'exécute. Vérifier son emplacement avec `sudo systemctl status cloudflared` ou
`docker ps`. S'il tourne dans un conteneur ou sur une autre machine, exécuter le
test depuis cet environnement : son `localhost` ne désigne pas forcément la VM
Coolify.

Le résultat doit être identique à la ligne `api.tcg-nexus.org` : type
**Tunnel**, contenu `tcg-nexus-main`, statut **Proxied** et TTL **Auto**.

| Public hostname | Service d'origine vérifié |
|---|---|
| `docs.tcg-nexus.org` | `http://localhost:80` ou `http://localhost:3002` selon le test ci-dessus |

L'ajout de cette *Published application route* crée et gère l'entrée DNS
correspondante. La page DNS l'affiche alors avec le type **Tunnel** même si ce
type n'apparaît pas dans la liste du formulaire DNS standard.

Ni le port 80 ni le port 3002 n'ont besoin d'être accessibles depuis Internet.
Ils doivent uniquement être joignables depuis l'environnement où `cloudflared`
s'exécute ; le tunnel transporte ensuite la requête par sa connexion sortante.

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
route d'origine cible le Service URL vérifié ci-dessus.

## Documentation de référence

- [Coolify — déploiement avec un Dockerfile](https://coolify.io/docs/applications/build-packs/dockerfile)
- [Coolify — domaines](https://coolify.io/docs/knowledge-base/domains)
- [Coolify — contrôles de santé](https://coolify.io/docs/knowledge-base/health-checks)
- [Coolify — variables de build et de runtime](https://coolify.io/docs/knowledge-base/environment-variables)
- [Docusaurus — déploiement](https://docusaurus.io/docs/deployment)
- [NestJS — OpenAPI/Swagger](https://docs.nestjs.com/openapi/introduction)
- [Cloudflare — publier une application avec Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/)
- [Cloudflare — créer une route Published application](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/#2a-publish-an-application)
- [Cloudflare Access — chemins d'application](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
