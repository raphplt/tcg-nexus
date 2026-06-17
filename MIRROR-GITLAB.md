# Miroir tcg-nexus → GitLab Etna (volet-168h)

Ce dépôt GitHub `tcg-nexus` est répliqué dans le **monorepo GitLab Etna**
`group-1076867`, sous le dossier **`168h/volet-168h`**, via **git subtree**.

```
group-1076867/                 (GitLab Etna, monorepo)
├── 168h/
│   ├── volet-168h/   ← tout tcg-nexus (importé en subtree, historique + auteurs)
│   └── volet-gpe/    ← inchangé
└── README.md
```

## Pourquoi subtree (et pas un miroir « racine »)

Le dépôt GitLab est un monorepo : il contient aussi `volet-gpe`. Il ne peut donc
pas être un miroir de tcg-nexus à la racine. `git subtree` permet d'embarquer
**tout le code et tout l'historique** de tcg-nexus dans le sous-dossier
`168h/volet-168h`, **en conservant l'auteur de chaque commit** (important pour le
suivi de contribution individuelle sur Etna).

Compromis assumé : seule la branche **`main`** est répliquée (pas les 100+
branches de feature). C'est le choix retenu pour respecter la structure de dossier
imposée.

## Mise à jour automatique

Workflow : `.github/workflows/mirror-volet-168h.yml`
- Se déclenche à **chaque push sur `main`** (et manuellement via *Run workflow*).
- 1er run → `git subtree add` (import initial). Runs suivants → `git subtree pull`.
- Import **sans `--squash`** : les commits individuels et leurs auteurs sont préservés.

### Configuration (à faire une seule fois)

1. **Créer un token GitLab Etna**
   - GitLab Etna → *Preferences → Access Tokens* (token perso) **ou**
     projet `group-1076867` → *Settings → Access Tokens* (Project Access Token).
   - Scope : **`write_repository`** (et `read_repository`).
   - Copier la valeur du token.

2. **Ajouter le secret côté GitHub**
   - `tcg-nexus` → *Settings → Secrets and variables → Actions → New repository secret*
   - Nom : `GITLAB_168H_TOKEN` — Valeur : le token.
   - (Optionnel) variable `GITLAB_REPO` pour surcharger le chemin du dépôt
     (défaut : `rendu-git.etna-alternance.net/module-10344/activity-55520/group-1076867.git`).

3. **Déclencher**
   - Pousser le workflow sur `main`, puis *Actions → Mirror to Etna GitLab → Run workflow*
     pour lancer l'import initial.

### Identité des pushs / des auteurs

- L'**auteur de chaque commit** importé est celui d'origine (GitHub) → chacun garde
  son profil dans l'historique GitLab. Veillez à ce que chaque dev commite avec
  sa bonne identité git (`git config user.name` / `user.email`).
- Les commits *wrapper* de synchro (merge subtree) sont signés par un bot de CI.
- Le `git push` vers GitLab est techniquement effectué par le token configuré.

## ⚠️ Points à vérifier

- **Accès réseau** : le runner GitHub doit pouvoir joindre
  `rendu-git.etna-alternance.net` en HTTPS. Si le GitLab Etna n'est accessible que
  depuis le réseau de l'école/VPN, l'Action échouera → utiliser la **synchro
  manuelle** ci-dessous (depuis une machine ayant l'accès).
- **Branche protégée** : si `main` est protégée sur GitLab, autoriser le push pour
  le porteur du token.
- **Ne pas éditer `168h/volet-168h` directement sur GitLab** : tout passe par
  tcg-nexus, sinon `git subtree pull` peut générer des conflits.

## Synchro manuelle (fallback)

Depuis une copie locale du dépôt **group-1076867** (avec accès au GitLab Etna) :

```bash
# À la racine de group-1076867
bash /chemin/vers/tcg-nexus/scripts/sync-volet-168h.sh https://github.com/raphplt/tcg-nexus.git
# puis, après vérification :
git push origin main
```

Le script fait l'`add` au premier passage puis le `pull` ensuite, sans `--squash`.
