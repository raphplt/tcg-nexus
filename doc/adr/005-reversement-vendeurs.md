# ADR-005 — Encaissement plateforme sans reversement automatisé aux vendeurs

- **Statut** : Accepté
- **Date** : 2026-08
- **Auteurs** : équipe TCG Nexus

## Contexte

La marketplace met en relation des vendeurs particuliers et des acheteurs. Le parcours d'achat est réel : le panier crée une commande, réserve le stock, ouvre un `PaymentIntent` Stripe, et la confirmation du paiement fait basculer la commande en `Paid`.

L'argent arrive donc sur **le compte Stripe de la plateforme**. Rien, aujourd'hui, ne le redescend vers le vendeur.

Cet entre-deux est un problème de crédibilité : l'écran « Mes ventes » affichait un « chiffre d'affaires » qui laissait croire à un versement, alors qu'aucun virement n'est déclenché. Il fallait trancher entre implémenter la chaîne complète et assumer explicitement la limite.

## Décision

**La plateforme encaisse, le reversement vendeur n'est pas implémenté.** C'est une limite assumée du périmètre projet, pas un oubli.

Concrètement :

1. Aucun compte Stripe Connect n'est créé pour les vendeurs. Le `PaymentIntent` est émis sur le compte plateforme, sans `transfer_data` ni `application_fee_amount`.
2. L'endpoint `GET /marketplace/sales/revenue` reste exposé, mais il décrit ce qu'il calcule réellement : **la somme des lignes vendues sur les commandes payées**, ventilée par devise. Ce n'est pas un solde disponible.
3. L'écran « Mes ventes » nomme cet indicateur **« Encaissé pour vous »** et affiche la mention : *le reversement vers votre compte bancaire n'est pas implémenté*.
4. Le remboursement (`charge.refunded`) reste géré, puisqu'il se joue entièrement sur le compte plateforme.
5. Aucun modèle de commission n'est introduit. Tant qu'il n'y a pas de reversement, prélever une commission n'aurait pas de sens.

## Alternatives considérées

### Implémenter Stripe Connect (Express)

C'est la réponse « produit » correcte.

- **+** Chaque vendeur possède un compte connecté, les fonds sont splittés au moment du paiement (`transfer_data.destination`), la plateforme prend sa commission via `application_fee_amount`, Stripe gère les virements.
- **−** Impose un parcours d'onboarding KYC complet (identité, IBAN, vérifications), la gestion des comptes rejetés ou incomplets, les webhooks `account.updated`, et un état « vendeur non payable » à propager dans toute la marketplace.
- **−** Impossible à démontrer sans comptes de test validés côté Stripe, ce qui fragilise la soutenance plus qu'il ne la renforce.
- **−** Un split au paiement suppose aussi de savoir gérer les commandes multi-vendeurs (un `PaymentIntent` par vendeur, ou des transferts séparés) : c'est un chantier à part entière.

### Simuler des virements en base

Créer une table `payout` et marquer des versements fictifs.

- **+** L'écran vendeur aurait un cycle de vie complet.
- **−** C'est précisément le piège dénoncé par l'audit : une donnée qui **ressemble** à un virement mais n'en est pas un. Un jury qui creuse trouve du faux, ce qui est pire que l'absence.

### Ne rien afficher au vendeur

- **+** Aucun risque d'induire en erreur.
- **−** Le vendeur perd une information légitime — ce qu'il a vendu et pour quel montant. Le problème n'était pas le chiffre, mais le mot « chiffre d'affaires » qui sous-entendait un versement.

## Conséquences

### Positives

- Ce que l'interface affiche correspond exactement à ce que le code fait.
- Le périmètre du paiement reste démontrable de bout en bout : panier → réservation → Stripe → webhook → commande payée → expédition.
- La dette est nommée et localisée, au lieu d'être diffuse.

### Négatives / à surveiller

- La plateforme conserve les fonds. Dans un contexte réel, ce serait un problème réglementaire (encaissement pour compte de tiers), pas seulement fonctionnel.
- Si Stripe Connect est ajouté plus tard, il faudra reprendre `startCheckout` : la commande multi-vendeurs devra soit être découpée en plusieurs `PaymentIntent`, soit s'appuyer sur des transferts post-paiement.
- L'écran vendeur devra alors distinguer *encaissé*, *disponible* et *versé* — trois notions que l'implémentation actuelle confond volontairement en une seule.
