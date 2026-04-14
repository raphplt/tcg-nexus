# TCG Nexus Project

Ce README se trouve à la racine du **dépôt GitLab fourni par l’ETNA** et référence l’ensemble des ressources nécessaires pour accéder à votre projet.

## 🔗 Liens de référence

- **Dépôt de développement (GitHub)** : [https://github.com/raphplt/tcg-nexus](https://github.com/raphplt/tcg-nexus)
- **Dépôt de rendu (GitLab ETNA)** : [https://rendu-git.etna-alternance.net/module-10020/activity-53631/group-1056981](https://rendu-git.etna-alternance.net/module-10020/activity-53631/group-1056981)
- **Story Map Figma** : [[https://www.figma.com/design/xJi3bYfxhX4HsBdPtxrw2r/Story-Map?node-id=0-1](https://www.figma.com/design/xJi3bYfxhX4HsBdPtxrw2r/Story-Map?node-id=0-1)](https://www.figma.com/design/xJi3bYfxhX4HsBdPtxrw2r/Story-Map?node-id=0-1&p=f&t=TNtJuYX659gcvBoe-0)
- **Wireframe Figma** : https://www.figma.com/design/ur8IpT8VxUjc3V7MFkvvTP/Wireframe?t=TNtJuYX659gcvBoe-0
- **Board Github Project** : https://github.com/users/raphplt/projects/3
- **Mirroring CI/CD** : GitHub Actions reproduit automatiquement ce repo sur GitLab

## 📂 Structure du projet

- `apps/web` : Front-end Next.js
- `apps/api` : Back-end NestJS
- `apps/fetch` : Microservice Express (fetch)
- `apps/doc` : Documentation technique
- `docs/` : Documentation supplémentaire (architecture, références, tests)

## 📁 Structure de rendu ETNA

- `/fiche_projet/` : **Fiche projet** (PDF) – contexte, objectifs, organisation, choix technos, story map
- `/suivi_de_progression/` : **Documents de suivi** – bilan & plan d’action (tous les 2 RUNs), fichiers datés
- `/apps`, `/docs` : Code source & documentation du POC

## 📝 Fiche Projet

> Chemin : `/fiche_projet/fiche_projet.pdf`

Contient :

- Contexte du projet et problématiques
- Objectifs et solutions proposées
- Organisation de l’équipe et rôles
- Choix méthodologiques (Scrum, sprints) et technos
- Story map et backlog priorisé

## 📊 Suivi de Progression

Dans `/suivi_de_progression/`, chaque fichier `suivi_RUN<N>_<YYYY-MM-DD>.md` comprend :

- Bilan des objectifs du RUN précédent (US réalisées, en cours, bloquées)
- Problèmes rencontrés
- Captures d’écran ou démos
- Plan d’action pour le RUN suivant

## ✅ Documentation Technique & POC

Le POC doit démontrer :

- Valeur d’usage partielle et faisabilité technique
- Respect des contraintes (performance, sécurité, stockage)

### Dossier `apps/doc` ou `docs/`

- `architecture.md` : schéma et explications de l’architecture
- `references.md` : liste des API et bibliothèques utilisées
- Tests : répertoire contenant tests unitaires et fonctionnels
- Commentaires in-code pertinents pour chaque module critique

## 🚀 Installation & Développement

### Prérequis

- Node.js ≥ 18
- npm ou yarn
- MySQL
- Turborepo

### Installation

```bash
git clone https://github.com/raphplt/tcg-nexus.git
cd tcg-nexus
npm install
```

### Seed de la base

```bash
npm run seed
```

### En mode développement

```bash
turbo dev
# ou
npm run dev
```

### Build

```bash
turbo build
```

### Tests unitaires

```bash
turbo test
```

### Déploiement

Exemple avec Docker :

```bash
docker-compose up --build
```

---

## 🖥️ Déploiement VM Debian (API + Postgres + CI/CD)

Cette section décrit **toutes les étapes** pour héberger `apps/api` et une BDD PostgreSQL sur une VM Debian, avec un déploiement automatique et migrations.

**Objectif** :

- API NestJS (`apps/api`)
- PostgreSQL persistant
- CI/CD automatique (build + deploy + migrations)

## 1) Accès VM + SSH

1. Créer la VM (Debian 12 recommandé).
2. Se connecter via le shell web (si SSH direct impossible).
3. Ajouter la clé publique dans `~/.ssh/authorized_keys` (droits 700/600).

Vérification :

```bash
ssh -i ~/.ssh/id_ed25519 <user>@<ip>
```

Si l’IP est en `172.16.x.x`, elle est privée : utilisez le **VPN/bastion** de l’école ou l’IP publique si disponible.

---

## 2) Sécurisation minimale

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Optionnel (recommandé) : créer un utilisateur non-root et désactiver l’auth par mot de passe dans `/etc/ssh/sshd_config`.

---

## 3) Installer Docker + Compose

```bash
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

---

## 4) Préparer le dossier de déploiement

Sur la VM :

```bash
mkdir -p /srv/tcg-nexus
cd /srv/tcg-nexus
```

Créer un fichier `.env` (exemple) :

```env
POSTGRES_DB=tcg
POSTGRES_USER=tcg
POSTGRES_PASSWORD=change_me
DATABASE_URL=postgresql://tcg:change_me@db:5432/tcg
NODE_ENV=production
```

---

## 5) Docker Compose (API + Postgres)

Créer `/srv/tcg-nexus/docker-compose.yml` :

```yaml
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    image: ghcr.io/<org>/<repo>-api:latest
    restart: always
    env_file: .env
    depends_on:
      - db
    ports:
      - "3000:3000"

volumes:
  db_data:
```

Remplace `<org>/<repo>` par ton registry (GitHub Container Registry, GitLab Registry, etc.).

---

## 6) Migrations automatiques

### — TypeORM

```bash
npm run migration:run
```

---

## 7) CI/CD (build + push + deploy + migrations)

Tu dois :

1. Build l’image Docker de `apps/api`.
2. Push dans un registry.
3. SSH sur la VM.
4. `docker compose pull` + `docker compose up -d`.
5. Lancer les migrations.

### Exemple (GitHub Actions)

Créer [.github/workflows/deploy.yml](.github/workflows/deploy.yml) :

```yaml
name: Deploy API
on:

  push:
    branches: ["main"]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login GHCR
        run: echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Build & Push API
        run: |
          docker build -t ghcr.io/<org>/<repo>-api:latest -f apps/api/Dockerfile .
          docker push ghcr.io/<org>/<repo>-api:latest

      - name: Deploy on VM
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: |
            cd /srv/tcg-nexus
            docker compose pull
            docker compose up -d
            docker compose exec -T api npx prisma migrate deploy
```

Secrets requis :

- `VM_HOST`, `VM_USER`, `VM_SSH_KEY`
- `GHCR_TOKEN`

### Exemple (GitLab CI)

Créer [.gitlab-ci.yml](.gitlab-ci.yml) :

```yaml
stages: [build, deploy]

build:
  stage: build
  image: docker:24
  services: [docker:24-dind]
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE/api:latest -f apps/api/Dockerfile .
    - docker push $CI_REGISTRY_IMAGE/api:latest

deploy:
  stage: deploy
  image: alpine:3.20
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
  script:
    - ssh -o StrictHostKeyChecking=no $VM_USER@$VM_HOST "cd /srv/tcg-nexus && docker compose pull && docker compose up -d && docker compose exec -T api npx prisma migrate deploy"
```

Variables requises :

- `VM_HOST`, `VM_USER`, `SSH_PRIVATE_KEY`

---

## 8) (Optionnel) Reverse proxy HTTPS

Installer Nginx + certbot (Let’s Encrypt) pour exposer l’API en HTTPS.

---

## 9) Vérifications post‑déploiement

```bash
docker ps
docker compose logs -f api
curl http://<ip>:3000/health
```

---

## 10) Récapitulatif ordre d’exécution

1. Accès SSH VM
2. Sécurisation + firewall
3. Docker/Compose
4. Dossier `/srv/tcg-nexus` + `.env`
5. `docker-compose.yml`
6. Registry + build/push
7. CI/CD deploy
8. Migrations
9. Vérif santé

## ⚙️ Microservice de fetch

Accessible à : `http://localhost:3005/tcgdex`

## 📜 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE).
