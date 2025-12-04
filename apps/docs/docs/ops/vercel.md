---
title: Déploiement sur Vercel (docs)
---

Guide rapide pour publier la doc Docusaurus (`apps/docs`) sur Vercel.

## Configuration Vercel

1. Dans le dashboard Vercel, choisissez **Add New Project** > votre repo.
2. **Root directory** : `apps/docs`
3. **Framework preset** : "Other" (Docusaurus n’est pas listé).
4. **Build Command** : `npm run build`
5. **Output Directory** : `build`
6. Node : Vercel utilise 18+ par défaut (ok avec Docusaurus 3). Si besoin, fixez `NODE_VERSION=18` dans les variables du projet.

Un fichier `apps/docs/vercel.json` est fourni avec ces valeurs.

## Variables d’environnement (optionnel)

Pas obligatoire pour la doc statique. Vous pouvez définir `DOCS_BASE_URL`/`SITE_URL` si vous personnalisez `docusaurus.config.ts` (sinon `http://localhost:3000` est utilisé pour le dev local).

## Build & preview en local

```bash
cd apps/docs
npm install   # si pas déjà fait
npm run build
npm run serve  # prévisualisation sur http://localhost:3000
```

## Points de contrôle

- `docusaurus.config.ts` : `baseUrl` est `/`, favicon/logo à jour.
- Sidebar à jour (`sidebars.ts`) et docs principales dans `apps/docs/docs/*`.
- Pour un déploiement monorepo, vérifiez que Vercel détecte bien `package-lock.json` dans `apps/docs` ou autorisez l’install via le lock du monorepo.
