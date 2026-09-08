import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CollectionItem } from "../collection-item/entities/collection-item.entity";
import { FulfillmentStatus } from "../common/enums/fulfillment-status";
import {
  MatchResultStatus,
  ProposalStatus,
} from "../common/enums/match-result-status";
import { Deck } from "../deck/entities/deck.entity";
import { Match, MatchStatus } from "../match/entities/match.entity";
import { MatchResultProposal } from "../match/entities/match-result-proposal.entity";
import { Order, OrderStatus } from "../marketplace/entities/order.entity";
import { TournamentDeckSnapshot } from "../tournament/entities/tournament-deck-snapshot.entity";
import {
  Tournament,
  TournamentStatus,
} from "../tournament/entities/tournament.entity";
import { TournamentRegistration } from "../tournament/entities/tournament-registration.entity";
import { User } from "./entities/user.entity";
import {
  ActionableJourneyItemDto,
  UserJourneyNextActionsDto,
} from "./dto/user-journey-next-actions.dto";

/**
 * Service orchestrating cross-feature journey navigation and prioritized next actions (INT-04).
 */
@Injectable()
export class UserJourneyService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(TournamentRegistration)
    private readonly registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchResultProposal)
    private readonly proposalRepository: Repository<MatchResultProposal>,
    @InjectRepository(TournamentDeckSnapshot)
    private readonly snapshotRepository: Repository<TournamentDeckSnapshot>,
    @InjectRepository(CollectionItem)
    private readonly collectionItemRepository: Repository<CollectionItem>,
  ) {}

  /**
   * Aggregates prioritized actionable tasks for the authenticated user across marketplace, collection, deck, and tournaments.
   */
  async getNextActions(user: User): Promise<UserJourneyNextActionsDto> {
    const actions: ActionableJourneyItemDto[] = [];

    // 1. Pending checkout orders
    const pendingOrders = await this.orderRepository.find({
      where: { buyer: { id: user.id }, status: OrderStatus.PENDING },
      order: { createdAt: "DESC" },
      take: 3,
    });

    for (const order of pendingOrders) {
      actions.push({
        id: `order-pending-${order.id}`,
        type: "CHECKOUT_PENDING",
        title: `Paiement en attente : Commande #${order.id}`,
        description: `Montant : ${Number(order.totalAmount).toFixed(2)} ${order.currency}. Validez votre achat avant expiration de la réservation.`,
        priority: "HIGH",
        actionUrl: `/checkout?orderId=${order.id}`,
        actionLabel: "Finaliser la commande",
        entityType: "order",
        entityId: order.id,
      });
    }

    // 2. Delivered orders with items not yet imported to collection
    const deliveredOrders = await this.orderRepository.find({
      where: {
        buyer: { id: user.id },
        status: OrderStatus.DELIVERED,
      },
      relations: ["orderItems"],
      order: { updatedAt: "DESC" },
      take: 5,
    });

    // Get imported order item IDs from user collection items
    const userImportedItems = await this.collectionItemRepository
      .createQueryBuilder("item")
      .innerJoin("item.collection", "collection")
      .innerJoin("collection.user", "user")
      .where("user.id = :userId", { userId: user.id })
      .andWhere("item.provenance IS NOT NULL")
      .getMany();

    const importedOrderItemIds = new Set(
      userImportedItems
        .filter((it) => it.provenance?.orderItemId != null)
        .map((it) => Number(it.provenance!.orderItemId)),
    );

    for (const order of deliveredOrders) {
      const unimportedCount = (order.orderItems || []).filter(
        (it) =>
          it.fulfillmentStatus === FulfillmentStatus.DELIVERED &&
          !importedOrderItemIds.has(it.id),
      ).length;

      if (unimportedCount > 0) {
        actions.push({
          id: `order-import-${order.id}`,
          type: "RECEIPT_IMPORT_PENDING",
          title: `Importez vos cartes reçues (Commande #${order.id})`,
          description: `${unimportedCount} carte(s) livrée(s) prête(s) à être intégrée(s) dans votre collection.`,
          priority: "MEDIUM",
          actionUrl: `/orders/${order.id}`,
          actionLabel: "Ajouter à ma collection",
          entityType: "order",
          entityId: order.id,
        });
      }
    }

    // 3. Active tournament registrations and obligations
    const activeRegistrations = await this.registrationRepository.find({
      where: {
        player: { user: { id: user.id } },
      },
      relations: ["tournament", "player", "player.user"],
    });

    for (const reg of activeRegistrations) {
      if (reg.droppedAt) continue;
      const tournament = reg.tournament;
      if (!tournament) continue;

      // Tournament deck submission check
      if (
        tournament.status === TournamentStatus.REGISTRATION_OPEN ||
        tournament.status === TournamentStatus.REGISTRATION_CLOSED
      ) {
        const snapshot = await this.snapshotRepository.findOne({
          where: {
            tournament: { id: tournament.id },
            player: { id: reg.player.id },
          },
        });

        if (!snapshot || !snapshot.isValid) {
          actions.push({
            id: `trn-deck-${tournament.id}`,
            type: "TOURNAMENT_DECK_SUBMISSION",
            title: `Deck requis pour le tournoi : ${tournament.name}`,
            description:
              "Soumettez votre deck de 60 cartes conforme avant le début de la compétition.",
            priority: "HIGH",
            actionUrl: `/tournaments/${tournament.id}/player`,
            actionLabel: "Soumettre mon deck",
            entityType: "tournament",
            entityId: tournament.id,
          });
        }
      }

      // Tournament active match check
      if (tournament.status === TournamentStatus.IN_PROGRESS) {
        const currentMatch = await this.matchRepository.findOne({
          where: [
            {
              tournament: { id: tournament.id },
              round: tournament.currentRound,
              playerA: { id: reg.player.id },
              status: MatchStatus.SCHEDULED,
            },
            {
              tournament: { id: tournament.id },
              round: tournament.currentRound,
              playerB: { id: reg.player.id },
              status: MatchStatus.SCHEDULED,
            },
          ],
        });

        if (currentMatch) {
          const pendingProposal = await this.proposalRepository.findOne({
            where: {
              match: { id: currentMatch.id },
              status: ProposalStatus.PENDING_CONFIRMATION,
            },
            relations: ["proposerUser"],
          });

          if (pendingProposal) {
            if (pendingProposal.proposerUser?.id !== user.id) {
              actions.push({
                id: `match-confirm-${currentMatch.id}`,
                type: "TOURNAMENT_SCORE_CONFIRMATION",
                title: `Confirmez le score de votre match (Ronde ${currentMatch.round})`,
                description: `Proposition : ${pendingProposal.playerAScore} - ${pendingProposal.playerBScore}. Validez ou contestez le résultat.`,
                priority: "HIGH",
                actionUrl: `/tournaments/${tournament.id}/player`,
                actionLabel: "Vérifier le score",
                entityType: "match",
                entityId: currentMatch.id,
              });
            }
          } else if (currentMatch.resultStatus === MatchResultStatus.DISPUTED) {
            actions.push({
              id: `match-dispute-${currentMatch.id}`,
              type: "DISPUTE_RESOLUTION_NEEDED",
              title: `Litige de score en cours (Ronde ${currentMatch.round})`,
              description:
                "Votre score est en cours d'examen par les arbitres du tournoi.",
              priority: "HIGH",
              actionUrl: `/tournaments/${tournament.id}/player`,
              actionLabel: "Voir le cockpit",
              entityType: "match",
              entityId: currentMatch.id,
            });
          } else {
            actions.push({
              id: `match-report-${currentMatch.id}`,
              type: "TOURNAMENT_SCORE_REPORT",
              title: `Rapportez le résultat de votre match (Ronde ${currentMatch.round})`,
              description:
                "Votre match est prêt à être joué. Transmettez votre score une fois la manche terminée.",
              priority: "HIGH",
              actionUrl: `/tournaments/${tournament.id}/player`,
              actionLabel: "Déclarer le score",
              entityType: "match",
              entityId: currentMatch.id,
            });
          }
        }
      }
    }

    // 4. Incomplete decks (< 60 cards)
    const userDecks = await this.deckRepository.find({
      where: { user: { id: user.id } },
      relations: ["cards"],
      order: { updatedAt: "DESC" },
      take: 3,
    });

    for (const deck of userDecks) {
      const cardCount = (deck.cards || []).reduce(
        (sum, dc) => sum + (dc.qty || 1),
        0,
      );
      if (cardCount < 60) {
        actions.push({
          id: `deck-missing-${deck.id}`,
          type: "DECK_MISSING_CARDS",
          title: `Complétez votre deck : ${deck.name}`,
          description: `Votre deck contient ${cardCount}/60 cartes. Trouvez les cartes manquantes sur le Marketplace.`,
          priority: "LOW",
          actionUrl: `/decks/${deck.id}`,
          actionLabel: "Compléter le deck",
          entityType: "deck",
          entityId: deck.id,
        });
      }
    }

    // Sort actions by priority: HIGH -> MEDIUM -> LOW
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    actions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return {
      userId: user.id,
      actions,
      totalActionableCount: actions.length,
      generatedAt: new Date(),
    };
  }
}
