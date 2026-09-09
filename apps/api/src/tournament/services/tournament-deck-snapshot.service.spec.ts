import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { DeckVisibilityPolicy } from "../../common/enums/deck-visibility-policy";
import { UserRole } from "../../common/enums/user";
import { TournamentStatus } from "../entities/tournament.entity";
import { DeckLegalityStatus } from "../entities/tournament-deck-snapshot.entity";
import { RegistrationStatus } from "../entities/tournament-registration.entity";
import { TournamentDeckSnapshotService } from "./tournament-deck-snapshot.service";

describe("TournamentDeckSnapshotService", () => {
  let service: TournamentDeckSnapshotService;
  let snapshotRepository: any;
  let tournamentRepository: any;
  let registrationRepository: any;
  let playerRepository: any;
  let deckRepository: any;
  let organizerRepository: any;
  let auditService: any;

  let revisionRepository: any;
  let deckLegality: any;

  beforeEach(() => {
    snapshotRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    tournamentRepository = {
      findOne: jest.fn(),
    };
    registrationRepository = {
      findOne: jest.fn(),
    };
    playerRepository = {
      findOne: jest.fn(),
    };
    deckRepository = {
      findOne: jest.fn(),
    };
    organizerRepository = {
      findOne: jest.fn(),
    };
    auditService = {
      record: jest.fn().mockResolvedValue({ id: 1 }),
    };
    revisionRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    // Legality comes from the catalog service; these tests cover the snapshot
    // lifecycle, and the rule checks have their own suite.
    deckLegality = {
      validate: jest.fn().mockResolvedValue({
        status: DeckLegalityStatus.VALID,
        errors: [],
        unknowns: [],
        totalCards: 60,
      }),
    };

    service = new TournamentDeckSnapshotService(
      snapshotRepository,
      tournamentRepository,
      registrationRepository,
      playerRepository,
      deckRepository,
      organizerRepository,
      revisionRepository,
      deckLegality,
      auditService,
    );
  });

  describe("submitDeckSnapshot", () => {
    it("should submit a valid 60-card snapshot", async () => {
      tournamentRepository.findOne.mockResolvedValue({
        id: 10,
        status: TournamentStatus.REGISTRATION_OPEN,
        currentRound: 0,
      });
      playerRepository.findOne.mockResolvedValue({
        id: 5,
        user: { id: 100, firstName: "Ash", lastName: "Ketchum" },
      });
      registrationRepository.findOne.mockResolvedValue({
        id: 1,
        status: RegistrationStatus.CONFIRMED,
      });
      snapshotRepository.findOne.mockResolvedValue(null);

      const cards = Array.from({ length: 60 }, (_, i) => ({
        cardId: `card-${i}`,
        name: `Card ${i}`,
        quantity: 1,
      }));

      const res = await service.submitDeckSnapshot(10, 100, {
        deckName: "Charizard Ex",
        cards,
      });

      expect(res.isValid).toBe(true);
      expect(res.cardCount).toBe(60);
      expect(snapshotRepository.save).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "SUBMIT_DECK_SNAPSHOT" }),
      );
    });

    it("should reject submission once tournament has started", async () => {
      tournamentRepository.findOne.mockResolvedValue({
        id: 10,
        status: TournamentStatus.IN_PROGRESS,
        currentRound: 1,
      });

      await expect(
        service.submitDeckSnapshot(10, 100, { deckName: "Deck", cards: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getTournamentDeckSnapshots visibility policy", () => {
    it("should mask card list if policy is PUBLIC_ON_START and tournament has not started", async () => {
      tournamentRepository.findOne.mockResolvedValue({
        id: 10,
        status: TournamentStatus.REGISTRATION_OPEN,
        currentRound: 0,
        deckVisibilityPolicy: DeckVisibilityPolicy.PUBLIC_ON_START,
      });

      snapshotRepository.find.mockResolvedValue([
        {
          id: 1,
          deckName: "Secret Deck",
          user: { id: 200, firstName: "Bob", lastName: "Builder" },
          cardsSnapshot: [{ cardId: "c1", name: "Pikachu", quantity: 4 }],
        },
      ]);

      const otherUser = { id: 300, role: UserRole.USER } as any;
      const res = await service.getTournamentDeckSnapshots(10, otherUser);

      expect(res[0].cards).toHaveLength(0);
      expect(res[0].cardCount).toBe(4);
    });

    it("should unmask card list for tournament organizer", async () => {
      tournamentRepository.findOne.mockResolvedValue({
        id: 10,
        status: TournamentStatus.REGISTRATION_OPEN,
        currentRound: 0,
        deckVisibilityPolicy: DeckVisibilityPolicy.PUBLIC_ON_START,
      });

      snapshotRepository.find.mockResolvedValue([
        {
          id: 1,
          deckName: "Secret Deck",
          user: { id: 200 },
          cardsSnapshot: [{ cardId: "c1", name: "Pikachu", quantity: 4 }],
        },
      ]);

      organizerRepository.findOne.mockResolvedValue({ id: 1, isActive: true });

      const organizerUser = { id: 999, role: UserRole.USER } as any;
      const res = await service.getTournamentDeckSnapshots(10, organizerUser);

      expect(res[0].cards).toHaveLength(1);
    });
  });
});
