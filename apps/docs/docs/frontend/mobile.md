---
title: Application Mobile (Expo)
---

L'application mobile de **TCG Nexus** (`apps/mobile`) est développée avec **React Native** et le framework **Expo 56**. Elle offre une expérience nomade centrée sur la reconnaissance de cartes physiques par photo et le suivi en temps réel des collections et tournois.

---

## 1. Stack technique

- **Moteur** : **Expo 56** + **React Native 0.85** + **React 19**.
- **Navigation** : **Expo Router** (routage basé sur le système de fichiers, équivalent à l'App Router de Next.js).
- **Gestion d'état** : **zustand** pour la persistance locale légère.
- **Réseau & Sécurité** : **axios** avec stockage chiffré des jetons de session via `expo-secure-store`.
- **Prise de vue** : `expo-camera` pour la capture en continu et `expo-image-manipulator` pour la compression et le recadrage.
- **Contrats partagés** : utilisation directe du package `@repo/scan-contract` pour garantir la synchronisation des types de requêtes/réponses avec l'API.

---

## 2. Navigation & Écrans (`app/`)

- `app/(auth)/` : écrans d'authentification (connexion et inscription).
- `app/(protected)/` : zone authentifiée :
  - `(tabs)/index` : écran d'accueil avec actualités et raccourcis ;
  - `(tabs)/scan` : interface du scanner de cartes physiques avec visée caméra en réalité augmentée ;
  - `(tabs)/collection` : consultation de sa collection et de sa liste d'envies (wishlist) ;
  - `(tabs)/decks` : consultation de ses listes de decks ;
  - `(tabs)/tournaments` : suivi de ses tournois et de ses matches ;
  - `(tabs)/profile` : profil public, niveau ELO, statistiques et paramètres ;
  - `notifications` : centre de réception des notifications push et in-app.

---

## 3. Les deux pipelines de Scan de cartes

Le mobile supporte deux modes d'exécution pour reconnaître une carte Pokémon :

### Mode 1 : Pipeline Serveur (`POST /scan/recognize`)
- Le smartphone capture une ou plusieurs photos de la carte physique et les expédie en `multipart/form-data` vers l'API NestJS.
- L'API délègue le traitement lourd au microservice [Vision](../services/vision) (recadrage, redressement de perspective, OCR multi-frame Tesseract).
- L'API effectue ensuite le matching de catalogue et renvoie la carte candidate scorée.
- Idéal lorsque le smartphone dispose d'une bonne connectivité Internet.

### Mode 2 : Pipeline On-Device (`POST /pokemon-card/scan-match`)
- Le smartphone exécute la détection de contour et l'extraction de zones d'intérêt directement en local.
- L'OCR du texte est exécuté via un service cloud rapide (Google Cloud Vision ou OCR.space configuré via variable d'environnement).
- Le mobile envoie uniquement les métadonnées textuelles extraites (`cardName`, `localId`, `setName`, `setNumber`) à l'endpoint léger `POST /pokemon-card/scan-match`.
- Réduit considérablement la consommation de bande passante réseau.

---

## 4. Configuration d'environnement (`apps/mobile/.env`)

```dotenv
# URL de l'API backend
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# Option OCR pour le pipeline on-device (au choix) :
EXPO_PUBLIC_OCR_SPACE_API_KEY=votre_cle_ocr_space      # gratuit, 25 000 requêtes/mois
EXPO_PUBLIC_GOOGLE_VISION_API_KEY=votre_cle_gcp       # nécessite facturation Google Cloud
```

---

## 5. Commandes de développement

```bash
cd apps/mobile

# Démarrer le serveur de développement Metro
npm run dev

# Lancer sur émulateur ou appareil connecté
npm run android
npm run ios

# Vérification du code
npm run lint
npm run check-types
```
