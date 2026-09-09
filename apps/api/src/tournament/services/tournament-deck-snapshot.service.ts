import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { DeckVisibilityPolicy } from "../../common/enums/deck-visibility-policy";
import { UserRole } from "../../common/enums/user";
import { Deck } from "../../deck/entities/deck.entity";
import { Player } from "../../player/entities/player.entity";
import { User } from "../../user/entities/user.entity";
import {
  SubmitTournamentDeckDto,
  SubmittedCardItemDto,
  TournamentDeckSnapshotResponseDto,
} from "../dto/tournament-deck-snapshot.dto";
import { Tournament, TournamentStatus } from "../entities/tournament.entity";
import {
  DeckLegalityStatus,
  SnapshotCardItem,
  TournamentDeckSnapshot,
} from "../entities/tournament-deck-snapshot.entity";
import { TournamentDeckSnapshotRevision } from "../entities/tournament-deck-snapshot-revision.entity";
import { TournamentOrganizer } from "../entities/tournament-organizer.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../entities/tournament-registration.entity";
import { DeckLegalityService } from "./deck-legality.service";

/**
 * Service managing tournament deck list snapshots and access-control visibility (TRN-02).
 */
@Injectable()
export class TournamentDeckSnapshotService {
  constructor(
    @InjectRepository(TournamentDeckSnapshot)
    private readonly snapshotRepository: Repository<TournamentDeckSnapshot>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private readonly registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Deck)
    private readonly deckRepository: Repository<Deck>,
    @InjectRepository(TournamentOrganizer)
    private readonly organizerRepository: Repository<TournamentOrganizer>,
    @InjectRepository(TournamentDeckSnapshotRevision)
    private readonly revisionRepository: Repository<TournamentDeckSnapshotRevision>,
    private readonly deckLegality: DeckLegalityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records an organizer decision over the computed legality of a list (TRN-02).
   *
   * The computed status and its reasons are kept; the override states who
   * accepted or refused the list and why, so an unverifiable rule can be
   * settled by a judge without the system claiming it verified one.
   *
   * @param tournamentId - Tournament the list belongs to.
   * @param snapshotId - Deck snapshot being decided.
   * @param user - Organizer or administrator making the decision.
   * @param decision - Accepted status and its justification.
   */
  async overrideLegality(
    tournamentId: number,
    snapshotId: number,
    user: User,
    decision: { legalityStatus: DeckLegalityStatus; reason: string },
  ): Promise<TournamentDeckSnapshotResponseDto> {
    const isOrganizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        user: { id: user.id },
        isActive: true,
      },
    });
    if (user.role !== UserRole.ADMIN && !isOrganizer) {
      throw new ForbiddenException(
        "Seul un organisateur actif ou un administrateur peut statuer sur une liste.",
      );
    }
    if (decision.legalityStatus === DeckLegalityStatus.UNVERIFIED) {
      throw new BadRequestException(
        "Une décision d'organisateur doit accepter ou refuser la liste.",
      );
    }

    const snapshot = await this.snapshotRepository.findOne({
      where: { id: snapshotId, tournament: { id: tournamentId } },
      relations: ["player", "player.user", "user", "deck"],
    });
    if (!snapshot) {
      throw new NotFoundException("Liste de deck introuvable pour ce tournoi.");
    }

    const previousStatus = snapshot.legalityStatus;
    snapshot.legalityStatus = decision.legalityStatus;
    snapshot.isValid = decision.legalityStatus === DeckLegalityStatus.VALID;
    snapshot.overriddenByUserId = user.id;
    snapshot.overrideReason = decision.reason;
    snapshot.overriddenAt = new Date();
    await this.snapshotRepository.save(snapshot);

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      targetType: "TOURNAMENT_DECK_SNAPSHOT",
      targetId: String(snapshot.id),
      action: "OVERRIDE_DECK_LEGALITY",
      reason: decision.reason,
      beforeState: { legalityStatus: previousStatus },
      afterState: {
        legalityStatus: decision.legalityStatus,
        revision: snapshot.revision,
      },
    });

    return this.mapToResponseDto(snapshot, true);
  }

  /**
   * Lists every submission recorded for a deck snapshot, newest first.
   */
  async getRevisions(
    snapshotId: number,
  ): Promise<TournamentDeckSnapshotRevision[]> {
    return this.revisionRepository.find({
      where: { snapshot: { id: snapshotId } },
      relations: ["submittedBy"],
      order: { revision: "DESC" },
    });
  }

  /**
   * Submits or updates a deck snapshot for an enrolled tournament player.
   *
   * @param tournamentId - Target tournament ID.
   * @param userId - Requesting user ID.
   * @param dto - Deck submission payload.
   */
  async submitDeckSnapshot(
    tournamentId: number,
    userId: number,
    dto: SubmitTournamentDeckDto,
  ): Promise<TournamentDeckSnapshotResponseDto> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    const now = new Date();
    const isPastDeadline =
      tournament.deckSubmissionDeadline &&
      now > tournament.deckSubmissionDeadline;
    const isTournamentStarted =
      tournament.status === TournamentStatus.IN_PROGRESS ||
      tournament.status === TournamentStatus.FINISHED ||
      (tournament.currentRound || 0) > 0;

    if (isPastDeadline || isTournamentStarted) {
      throw new BadRequestException(
        "Les soumissions de deck sont clôturées pour ce tournoi.",
      );
    }

    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    if (!player) {
      throw new NotFoundException("Joueur non trouvé pour cet utilisateur.");
    }

    const registration = await this.registrationRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        player: { id: player.id },
      },
    });

    if (
      !registration ||
      registration.status === RegistrationStatus.CANCELLED ||
      registration.status === RegistrationStatus.ELIMINATED
    ) {
      throw new ForbiddenException(
        "Vous devez être inscrit activement à ce tournoi pour soumettre une liste.",
      );
    }

    let snapshot = await this.snapshotRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        player: { id: player.id },
      },
      relations: ["player", "player.user", "user", "deck"],
    });

    if (snapshot?.isLocked) {
      throw new BadRequestException(
        "Votre liste de deck pour ce tournoi est déjà verrouillée et ne peut plus être modifiée.",
      );
    }

    let cards: SnapshotCardItem[] = [];
    let deckName = dto.deckName || "Deck de tournoi";
    let deckEntity: Deck | null = null;

    if (dto.cards && dto.cards.length > 0) {
      cards = dto.cards.map((c) => ({
        cardId: c.cardId,
        name: c.name,
        quantity: c.quantity || 1,
        role: c.role,
        supertype: c.supertype,
        setCode: c.setCode,
      }));
    } else if (dto.deckId) {
      deckEntity = await this.deckRepository.findOne({
        where: { id: dto.deckId, user: { id: userId } },
        relations: [
          "cards",
          "cards.card",
          "cards.card.translations",
          "cards.card.set",
          "format",
        ],
      });

      if (!deckEntity) {
        throw new NotFoundException("Deck introuvable dans votre collection.");
      }

      deckName = deckEntity.name;
      cards = (deckEntity.cards ?? []).map((dc) => ({
        cardId: String(dc.card.id),
        name:
          dc.card.name ||
          dc.card.translations?.[0]?.name ||
          `Card #${dc.card.id}`,
        quantity: dc.qty,
        role: dc.role,
        supertype: dc.card.category ?? undefined,
        setCode: dc.card.set?.id ?? undefined,
      }));
    } else {
      throw new BadRequestException(
        "Veuillez fournir un deck existant (deckId) ou une liste de cartes explicite.",
      );
    }

    const formatIdNum = dto.formatId
      ? Number(dto.formatId) || null
      : (deckEntity?.format?.id ?? null);
    const ruleVersion =
      dto.ruleVersion || snapshot?.ruleVersion || "POKEMON_STANDARD_2026";

    // Legality is decided from the catalog and the rule data available: an
    // unknown card is refused, and a rule that cannot be read leaves the list
    // unverified instead of being reported as legal.
    const legality = await this.deckLegality.validate(
      cards,
      ruleVersion,
      formatIdNum,
    );
    const totalCards = legality.totalCards;
    const validationErrors = [...legality.errors, ...legality.unknowns];
    const isValid = legality.status === DeckLegalityStatus.VALID;

    if (!snapshot) {
      snapshot = this.snapshotRepository.create({
        tournament: { id: tournamentId } as Tournament,
        player,
        user: { id: userId } as User,
        deck: deckEntity,
        deckName,
        formatId: formatIdNum,
        ruleVersion,
        cardsSnapshot: cards,
        isLocked: false,
        isValid,
        legalityStatus: legality.status,
        revision: 1,
        validationErrors: validationErrors.length ? validationErrors : null,
        submittedAt: now,
      });
    } else {
      snapshot.deck = deckEntity ?? snapshot.deck;
      snapshot.deckName = deckName;
      snapshot.formatId = formatIdNum ?? snapshot.formatId;
      snapshot.ruleVersion = ruleVersion;
      snapshot.cardsSnapshot = cards;
      snapshot.isValid = isValid;
      snapshot.legalityStatus = legality.status;
      snapshot.revision = (snapshot.revision ?? 1) + 1;
      // A new submission supersedes an organizer decision on the previous list.
      snapshot.overriddenByUserId = null;
      snapshot.overrideReason = null;
      snapshot.overriddenAt = null;
      snapshot.validationErrors = validationErrors.length
        ? validationErrors
        : null;
      snapshot.submittedAt = now;
    }

    await this.snapshotRepository.save(snapshot);

    // Every submission is kept, so a correction never erases what a player
    // originally registered or what the rules said about it.
    await this.revisionRepository.save(
      this.revisionRepository.create({
        snapshot,
        revision: snapshot.revision,
        submittedBy: { id: userId } as User,
        cardsSnapshot: cards,
        legalityStatus: legality.status,
        validationErrors: validationErrors.length ? validationErrors : null,
        ruleVersion,
      }),
    );

    await this.auditService.record({
      actorId: userId,
      actorRole: "PLAYER",
      targetType: "TOURNAMENT_DECK_SNAPSHOT",
      targetId: String(snapshot.id),
      action: "SUBMIT_DECK_SNAPSHOT",
      afterState: {
        tournamentId,
        playerId: player.id,
        totalCards,
        legalityStatus: legality.status,
        revision: snapshot.revision,
        isValid,
      },
    });

    return this.mapToResponseDto(snapshot, true);
  }

  /**
   * Retrieves player's own submitted deck snapshot for a tournament.
   */
  async getMyDeckSnapshot(
    tournamentId: number,
    userId: number,
  ): Promise<TournamentDeckSnapshotResponseDto | null> {
    const player = await this.playerRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!player) return null;

    const snapshot = await this.snapshotRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        player: { id: player.id },
      },
      relations: ["player", "player.user", "user", "deck"],
    });

    if (!snapshot) return null;

    return this.mapToResponseDto(snapshot, true);
  }

  /**
   * Retrieves all deck snapshots of a tournament, masking cards if restricted by visibility policy.
   */
  async getTournamentDeckSnapshots(
    tournamentId: number,
    requestingUser?: User,
  ): Promise<TournamentDeckSnapshotResponseDto[]> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    const isOrganizerOrAdmin =
      requestingUser?.role === UserRole.ADMIN ||
      (requestingUser
        ? await this.organizerRepository.findOne({
            where: {
              tournament: { id: tournamentId },
              user: { id: requestingUser.id },
              isActive: true,
            },
          })
        : false);

    const snapshots = await this.snapshotRepository.find({
      where: { tournament: { id: tournamentId } },
      relations: ["player", "player.user", "user", "deck"],
      order: { submittedAt: "DESC" },
    });

    return snapshots.map((snapshot) => {
      const isOwner = requestingUser && snapshot.user?.id === requestingUser.id;
      const canViewCards =
        isOrganizerOrAdmin || isOwner || this.canViewCardsByPolicy(tournament);

      return this.mapToResponseDto(snapshot, Boolean(canViewCards));
    });
  }

  /**
   * Locks all registered snapshots for a tournament (e.g. at round 1 start or deadline).
   */
  async lockSnapshotsForTournament(tournamentId: number): Promise<number> {
    const now = new Date();
    const result = await this.snapshotRepository.update(
      { tournament: { id: tournamentId }, isLocked: false },
      { isLocked: true, lockedAt: now },
    );
    return result.affected ?? 0;
  }

  /**
   * Evaluates if cards are publicly accessible according to tournament visibility policy.
   */
  private canViewCardsByPolicy(tournament: Tournament): boolean {
    const policy =
      tournament.deckVisibilityPolicy ?? DeckVisibilityPolicy.PUBLIC_ON_START;

    switch (policy) {
      case DeckVisibilityPolicy.ALWAYS_PRIVATE:
        return false;
      case DeckVisibilityPolicy.PUBLIC_ON_START:
        return (
          tournament.status === TournamentStatus.IN_PROGRESS ||
          tournament.status === TournamentStatus.FINISHED ||
          (tournament.currentRound || 0) >= 1
        );
      case DeckVisibilityPolicy.PUBLIC_AFTER_EVENT:
        return (
          tournament.status === TournamentStatus.FINISHED ||
          Boolean(tournament.isFinished)
        );
      default:
        return false;
    }
  }

  private mapToResponseDto(
    snapshot: TournamentDeckSnapshot,
    includeCards: boolean,
  ): TournamentDeckSnapshotResponseDto {
    const rawCards = snapshot.cardsSnapshot || [];
    const cardCount = rawCards.reduce(
      (sum, item) => sum + (item.quantity || 1),
      0,
    );

    const cards: SubmittedCardItemDto[] = rawCards.map((c) => ({
      cardId: c.cardId,
      name: c.name,
      quantity: c.quantity,
      role: c.role,
      supertype: c.supertype,
      setCode: c.setCode,
    }));

    const playerName = snapshot.player?.user
      ? `${snapshot.player.user.firstName || ""} ${snapshot.player.user.lastName || ""}`.trim() ||
        snapshot.player.user.email
      : `Player #${snapshot.player?.id}`;

    return {
      id: snapshot.id,
      tournamentId: snapshot.tournament?.id,
      playerId: snapshot.player?.id,
      userId: snapshot.user?.id,
      playerName,
      deckId: snapshot.deck?.id,
      deckName: snapshot.deckName,
      formatId: snapshot.formatId ? String(snapshot.formatId) : undefined,
      ruleVersion: snapshot.ruleVersion,
      cardsSnapshot: includeCards ? cards : [],
      cards: includeCards ? cards : [],
      cardCount,
      isLocked: snapshot.isLocked,
      isValid: snapshot.isValid,
      validationErrors: snapshot.validationErrors,
      submittedAt: snapshot.submittedAt,
      lockedAt: snapshot.lockedAt,
    };
  }
}
