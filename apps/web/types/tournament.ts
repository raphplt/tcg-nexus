import { User } from "./auth";

export enum TournamentType {
  SINGLE_ELIMINATION = "single_elimination",
  DOUBLE_ELIMINATION = "double_elimination",
  SWISS_SYSTEM = "swiss_system",
  ROUND_ROBIN = "round_robin",
}

export enum TournamentStatus {
  DRAFT = "draft",
  REGISTRATION_OPEN = "registration_open",
  REGISTRATION_CLOSED = "registration_closed",
  IN_PROGRESS = "in_progress",
  FINISHED = "finished",
  CANCELLED = "cancelled",
}

export type Tournament = {
  id: number;
  name: string;
  description?: string | null;
  location?: string | null;
  isExternal?: boolean;
  externalRegistrationUrl?: string | null;
  startDate: string;
  endDate: string;
  type: TournamentType | string;
  status: TournamentStatus | string;
  isPublic?: boolean;
  isFinished?: boolean;
  currentRound?: number;
  totalRounds?: number;
  registrationDeadline?: string | null;
  allowLateRegistration?: boolean;
  requiresApproval?: boolean;
  rules?: string | null;
  additionalInfo?: string | null;
  maxPlayers?: number;
  minPlayers?: number;
  players?: Player[];
  matches?: Match[];
  rankings?: Ranking[];
  registrations?: TournamentRegistration[];
  rewards?: Reward[];
  pricing?: Pricing | null;
  organizers?: Organizer[];
  notifications?: Notification[];
};
export interface Match {
  id: number;
  tournament: Tournament;
  playerA?: Player;
  playerB?: Player;
  winner?: Player;
  round: number;
  phase: "qualification" | "quarter_final" | "semi_final" | "final";
  status: "scheduled" | "in_progress" | "finished" | "forfeit" | "cancelled";
  resultStatus?: "unreported" | "proposed" | "confirmed" | "disputed";
  tableNumber?: number | null;
  scheduledDate?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  playerAScore: number;
  playerBScore: number;
  notes?: string | null;
  proposals?: MatchResultProposal[];
}
export interface Ranking {
  id: number;
  tournament: Tournament;
  player: Player;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  omwPercentage?: number;
  gwPercentage?: number;
  ogwPercentage?: number;
  byesCount?: number;
  isProvisional?: boolean;
  tiebreakExplanation?: string;
}
export interface Reward {
  id: number;
  position: number;
  name: string;
  description?: string | null;
  type?: string | null;
  imageUrl?: string | null;
}
export interface Pricing {
  id: number;
  type: string;
  basePrice: string;
  earlyBirdPrice?: string | null;
  priceDescription?: string | null;
  refundable?: boolean;
}
export interface Organizer {
  id: number;
  user: User;
  name: string;
  email?: string | null;
  role?: string | null;
}
export interface Notification {
  id: number;
  title: string;
  message?: string | null;
  type?: string | null;
  status?: string | null;
}

export interface Player {
  id: number;
  name: string;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export type BracketSide = "winners" | "losers" | "grand_final";

export interface BracketStructure {
  type:
    | "single_elimination"
    | "double_elimination"
    | "swiss_system"
    | "round_robin";
  totalRounds: number;
  rounds: BracketRound[];
}

export interface BracketRound {
  index: number;
  matches: BracketMatch[];
}

export interface BracketMatch {
  matchId?: number;
  round: number;
  position: number;
  playerA?: {
    id: number;
    name: string;
    seed?: number;
  };
  playerB?: {
    id: number;
    name: string;
    seed?: number;
  };
  winnerId?: number;
  status?: Match["status"];
  playerAScore?: number;
  playerBScore?: number;
  scheduledDate?: string;
  nextMatchId?: number;
  nextSlot?: "A" | "B";
  loserNextMatchId?: number;
  loserNextSlot?: "A" | "B";
  /** Branch of the bracket; only elimination formats fill it. */
  bracketSide?: BracketSide;
  isBye?: boolean;
  phase: "qualification" | "quarter_final" | "semi_final" | "final";
}

export interface TournamentProgress {
  status: string;
  currentRound: number;
  totalRounds: number;
  completedMatches: number;
  totalMatches: number;
  activePlayers: number;
  eliminatedPlayers: number;
  progressPercentage: number;
}

export interface TournamentRegistration {
  id: number;
  tournament: Tournament;
  player: Player;
  status: "pending" | "confirmed" | "cancelled" | "waitlisted" | "eliminated";
  notes?: string;
  eliminatedAt?: string;
  eliminatedRound?: number;
  checkedIn: boolean;
  checkedInAt?: string;
  registeredAt: string;
}

export interface StateTransition {
  currentStatus: string;
  availableTransitions: string[];
  transitionDescriptions: Record<string, string>;
}

export interface CreateTournamentDto {
  name: string;
  description?: string;
  isExternal?: boolean;
  externalRegistrationUrl?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  type: TournamentType | string;
  isPublic?: boolean;
  allowLateRegistration?: boolean;
  requiresApproval?: boolean;
  /** Double elimination only: play a deciding grand final when needed. */
  grandFinalReset?: boolean;
  maxPlayers?: number;
  minPlayers?: number;
  rules?: string;
  additionalInfo?: string;
  ageRestrictionMin?: number;
  ageRestrictionMax?: number;
  allowedFormats?: string[];
}

export interface ReportScoreDto {
  playerAScore: number;
  playerBScore: number;
  isForfeit?: boolean;
  notes?: string;
}

export interface StartMatchDto {
  notes?: string;
}

export interface ResetMatchDto {
  reason: string;
}

export interface StartTournamentOptions {
  seedingMethod?: "random" | "ranking" | "elo" | "manual";
  checkInRequired?: boolean;
}

export interface UpdateTournamentStatusDto {
  status: string;
}

export interface TournamentRegistrationDto {
  tournamentId: number;
  playerId: number;
  notes?: string;
}

export interface MatchResultProposal {
  id: number;
  playerAScore: number;
  playerBScore: number;
  status:
    | "pending_confirmation"
    | "confirmed"
    | "disputed"
    | "superseded"
    | "resolved_by_organizer";
  opponentResponse: "pending" | "accepted" | "rejected";
  disputeReason?: string | null;
  organizerResolutionReason?: string | null;
  createdAt: string;
}

export interface SubmittedCardItem {
  cardId: string;
  name: string;
  quantity: number;
  role?: string;
  supertype?: string;
  setCode?: string;
}

export interface TournamentDeckSnapshot {
  id: number;
  tournamentId: number;
  playerId: number;
  userId?: number;
  playerName?: string;
  deckId?: number | null;
  deckName: string;
  formatId?: string;
  ruleVersion: string;
  cards: SubmittedCardItem[];
  cardsSnapshot?: SubmittedCardItem[];
  cardCount: number;
  isLocked: boolean;
  isValid: boolean;
  validationErrors?: string[] | null;
  submittedAt: string;
  lockedAt?: string | null;
}

export interface RoundClockStatus {
  tournamentId: number;
  currentRound: number;
  roundStartedAt: string | null;
  roundDeadline: string | null;
  roundDurationMinutes: number;
  isRoundPaused: boolean;
  pausedAt: string | null;
  remainingSeconds: number;
  isExpired: boolean;
}

export interface ExplainableStanding {
  rank: number;
  playerId: number;
  playerName: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  winRate: number;
  omwPercentage: number;
  gwPercentage: number;
  ogwPercentage: number;
  isProvisional: boolean;
  tiebreakExplanation?: string;
}

export interface ExplainableStandingsResponse {
  tournamentId: number;
  tournamentName: string;
  currentRound: number;
  totalRounds: number;
  isFinished: boolean;
  ruleVersion: string;
  generatedAt: string;
  standings: ExplainableStanding[];
}

export interface ActiveMatchCockpit {
  matchId: number;
  round: number;
  tableNumber?: number | null;
  opponentName?: string;
  opponentPlayerId?: number;
  status: string;
  resultStatus: string;
  myScore: number;
  opponentScore: number;
  pendingProposal?: {
    proposalId: number;
    proposedByMe: boolean;
    playerAScore: number;
    playerBScore: number;
    status: string;
    opponentResponse: string;
    disputeReason?: string | null;
  } | null;
}

export interface PlayerTournamentDashboard {
  tournamentId: number;
  tournamentName: string;
  tournamentStatus: string;
  currentRound: number;
  totalRounds: number;
  registrationStatus: string;
  checkedIn: boolean;
  isDropped: boolean;
  roundStartedAt?: string | null;
  roundDeadline?: string | null;
  isRoundPaused: boolean;
  remainingSeconds?: number | null;
  deckStatus: {
    isSubmitted: boolean;
    isLocked: boolean;
    isValid: boolean;
    deckName?: string;
    deckId?: number | null;
    validationErrors?: string[] | null;
  };
  activeMatch?: ActiveMatchCockpit | null;
  nextAction:
    | "SUBMIT_DECK"
    | "CHECK_IN"
    | "WAIT_FOR_PAIRINGS"
    | "PLAY_MATCH"
    | "REPORT_SCORE"
    | "CONFIRM_SCORE"
    | "AWAIT_SCORE_CONFIRMATION"
    | "DISPUTE_IN_PROGRESS"
    | "WAIT_FOR_NEXT_ROUND"
    | "TOURNAMENT_FINISHED"
    | "PLAYER_DROPPED";
}
