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
  scheduledDate?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  playerAScore: number;
  playerBScore: number;
  notes?: string | null;
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
  nextMatchId?: number;
  nextSlot?: "A" | "B";
  phase: "qualification" | "quarter_final" | "semi_final" | "final";
}

export interface SwissPairing {
  round: number;
  pairings: {
    playerA: Player;
    playerB?: Player;
    tableNumber: number;
  }[];
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

// DTOs

export interface CreateTournamentDto {
  name: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  type: TournamentType | string;
  isPublic?: boolean;
  allowLateRegistration?: boolean;
  requiresApproval?: boolean;
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
