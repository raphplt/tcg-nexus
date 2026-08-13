---
title: Notifications
---

Notifications in-app, push (mobile) et emails, générées principalement en réaction à des événements applicatifs (tournois, matchs) plutôt qu'appelées directement par le front.

- **Base path** : `/notifications`
- **Auth requise** : oui (`JwtAuthGuard` sur tout le controller).

## Endpoints

- `GET /notifications` : notifications paginées de l'utilisateur courant (`page`, `limit`, `filter`).
- `PATCH /notifications/:id/read` : marquer une notification comme lue.
- `PATCH /notifications/read-all` : tout marquer comme lu.
- `DELETE /notifications/:id` : supprimer une notification.
- `POST /notifications/tokens` : enregistrer un token d'appareil pour le push (Expo par défaut).
- `POST /notifications/register-device` : alias historique de `/tokens`, conservé pour compatibilité client.
- `DELETE /notifications/tokens/:token` : désenregistrer un token.

## Génération événementielle

`NotificationListener` écoute des événements applicatifs (`@OnEvent`) plutôt que d'être appelé directement par un controller métier — un tournoi qui démarre, se termine, ou un match prêt à être joué déclenchent chacun une notification (in-app + push + email selon le cas), sans coupler le module `tournament`/`match` au module `notification`. `NotificationReminderScheduler` complète avec un cron quotidien (rappels de matchs à venir).

## Traduction

Les notifications récentes ne stockent pas un texte figé : `Notification.translationKey` + `data` (paramètres) sont résolus à l'affichage/l'envoi dans la langue du destinataire (`NotificationI18nService`, `MailI18nService` pour les emails) — voir [Traductions](./translations). Les champs `title`/`body` restent en base pour les notifications historiques créées avant ce mécanisme.

## Temps réel — `NotificationGateway` (Socket.IO, namespace `/notification`)

Pousse les nouvelles notifications aux clients connectés sans qu'ils aient à repoller `GET /notifications`.

## Push mobile

`DeviceToken` (`token` unique, `platform`, défaut `expo`) rattache un jeton de notification push à un utilisateur — un par appareil enregistré depuis [l'app mobile](../frontend/mobile).
