# ADR 006 — Modèle d'Identité OAuth 2.0 PKCE & Séparation des Sessions Web / Mobile

- **Statut** : Accepté
- **Date** : 2026-08-28
- **Auteurs** : Équipe TCG Nexus
- **Contexte** : Consolidation pré-soutenance (Chantier AUTH-01 / AUTH-02 / AUTH-03)

---

## 1. Contexte et Problématique

L'authentification sur TCG Nexus s'effectuait initialement par identifiants locaux (email / mot de passe). Pour répondre aux exigences de conformité et d'expérience utilisateur moderne, la plateforme devait intégrer :
1. La connexion tierce via Google OAuth 2.0 / OpenID Connect.
2. Une séparation stricte des contrats de session :
   - **Web (Next.js)** : Jetons JWT encapsulés exclusivement dans des cookies `HttpOnly`, `Secure`, `SameSite=Lax` (zéro token dans les payloads JSON) afin de prévenir tout vol de session par injection XSS.
   - **Mobile (Expo / React Native)** : Jetons JWT retournés dans le corps JSON pour stockage sécurisé via `Expo SecureStore` / Keychain.

---

## 2. Décisions Architecturales

### 2.1 Modèle de Données `AuthIdentity`

- Création d'une entité dédiée `AuthIdentity` (`auth_identity`) liée à `User` par relation `@ManyToOne(onDelete: 'CASCADE')`.
- Index unique composite sur `(provider, providerSubject)`.
- Rendre la colonne `user.password` nullable afin de supporter les comptes créés exclusivement par OAuth sans générer de faux mot de passe.
- Règle métier de déliaison : un utilisateur ne peut délier son fournisseur OAuth que s'il dispose d'un mot de passe local ou d'au moins une autre identité tierce active.

### 2.2 Flux d'Autorisation OAuth avec PKCE (S256)

- **Flux Web** :
  1. `GET /auth/oauth/google/start?returnTo=...` :
     - Validation de l'URL de retour (`returnTo`) contre une liste blanche sécurisée.
     - Génération d'un `code_verifier` aléatoire et du `code_challenge` SHA-256 (`S256`), ainsi que des paramètres `state` et `nonce`.
     - Stockage de l'état dans un cookie de transaction chiffré/HttpOnly (`oauth_tx`) valable 5 minutes.
     - Redirection vers l'écran de consentement Google.
  2. `GET /auth/oauth/google/callback` :
     - Vérification de la correspondance de `state`.
     - Échange du code d'autorisation contre les jetons Google via `https://oauth2.googleapis.com/token`.
     - Résolution ou création atomique du compte utilisateur et de l'identité `AuthIdentity` dans une transaction PostgreSQL.
     - Émission des cookies `accessToken` et `refreshToken` et redirection vers la destination validée.
- **Flux Mobile** :
  - `POST /auth/oauth/google/mobile/exchange` recevant `{ code, codeVerifier, redirectUri }` et renvoyant le profil utilisateur et les jetons JWT dans le payload JSON.

---

## 3. Conséquences et Bénéfices

- **Sécurité Maximale** : Protection contre les attaques CSRF et XSS sur le web grâce aux cookies HttpOnly et au standard PKCE S256.
- **Évolutivité Multi-Fournisseurs** : L'architecture `AuthIdentity` permet d'ajouter aisément Apple Sign-In ou Discord sans modifier la structure de la table `user`.
- **Zéro Régression** : Les routes historiques `/auth/login`, `/auth/register` restent supportées tout en fournissant les endpoints spécialisés `/auth/web/*` et `/auth/mobile/*`.
