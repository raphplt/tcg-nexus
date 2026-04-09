# **PokeVentory**

PokeVentory est une application permettant de gérer une collection de cartes Pokémon : ajout, suivi, organisation par set, et estimation de valeur.
Le projet est structuré en monorepo avec un backend FastAPI et un frontend Nuxt 3.

---

## **Structure**

```
/frontend   → Interface utilisateur (Nuxt 4, Tailwind)
/backend    → API (FastAPI, PostgreSQL)
```

---

## **État actuel du repo**

- **Backend FastAPI**
  - Authentification JWT (login/refresh/logout + middleware `get_current_user`).
  - Modèles complets importés depuis TCGdex (`Series`, `Set`, `Card`) + scheduler APScheduler.
  - Nouveau pipeline d'import d'images (`analysis_images`, `card_drafts`, `user_cards`, `user_master_set`) et services dédiés (Redis, OCR, matching, progression de master set).
  - Migrations Alembic (`backend/migrations`) + documentation détaillée (`backend/docs/IMAGE_PIPELINE.md`).

- **Frontend Nuxt 4**
  - Auth composables (`useApi`, `useAuth`, `useCards`).
  - Page `import.vue` avec FilePond, affichage des candidats, bouton "Valider" + "Plus d'options", intégration complète avec l'API FastAPI.
  - Nuxt UI + Tailwind pour le design.

---

## **Fonctionnalités prévues**

* Gestion de la collection (ajout, édition, suppression)
* Organisation par set / numéro / rareté
* Suivi d’informations : état, prix d’acquisition, date d’acquisition
* Import simplifié via photo (OCR du numéro + suggestions)
* Visualisation de cartes manquantes par set (mastersets)
* Suivi de la valeur de la collection (prix externes)
* Dashboard basique : valeur totale + évolution

---

## **Technologies**

**Frontend**

* Nuxt 4
* TailwindCSS
* @nuxt/ui

**Backend**

* FastAPI
* SQLAlchemy
* PostgreSQL
* Redis + OpenCV + Pytesseract + RapidFuzz pour l'analyse
* OCR (pytesseract)

---

## **Pipeline d'import d'images**

Le flux complet FilePond → FastAPI → création d'un `user_card` est décrit dans [`backend/docs/IMAGE_PIPELINE.md`](backend/docs/IMAGE_PIPELINE.md) :

1. Upload FilePond (`POST /imports/batches`) → stockage Redis + analyse OCR/CV.
2. Retour des `card_drafts` (candidats scorés).
3. Validation (`POST /imports/drafts/{id}/select`) → création `user_cards` + mise à jour `user_master_set`.

Sur le frontend, la page `import.vue` expose :

- Liste des images sélectionnées.
- Résultats d'analyse par carte détectée (top 1 + "Plus d'options").
- Bouton "Valider" qui appelle directement l'API pour ajouter la carte à la collection.

---

## **Installation**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
make install
make run
```

---

## **Objectif du projet**

Fournir un outil simple pour gérer une collection Pokémon de manière propre, structurée et visuelle, sans dépendre d’un Excel ou d’applications limitées.
