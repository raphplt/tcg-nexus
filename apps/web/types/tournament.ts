export type Tournament = {
  id: number;
  name: string;
  description?: string | null;
  location?: string | null;
  startDate: string;
  endDate: string;
  type: string;
  status: TournamentStatus;
  isPublic?: boolean;
  isFinished?: boolean;
  currentRound?: number;
  totalRounds?: number;
  registrationDeadline?: string | null;
  allowLateRegistration?: boolean;
  requiresApproval?: boolean;
  rules?: string | null;
  additionalInfo?: string | null;
  players?: Player[];
  matches?: Match[];
  rankings?: Ranking[];
  rewards?: Reward[];
  pricing?: Pricing | null;
  organizers?: Organizer[];
  notifications?: Notification[];
};
export interface Match {
  id: number;
  round: number;
  phase?: string | null;
  status: string;
  scheduledDate?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  playerAScore?: number | null;
  playerBScore?: number | null;
  notes?: string | null;
}
export interface Ranking {
  id: number;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  winRate?: string | null;
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

//TODO : à compléter
export interface Player {
  id: number;
  name: string;
}

export interface TournamentRegistration {
  id: number;
  tournament: { id: number } | number;
  player: { id: number } | number;
  status: RegistrationStatus;
  notes?: string | null;
  registeredAt?: string;
}

export enum RegistrationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  WAITLISTED = "waitlisted",
  ELIMINATED = "eliminated",
}

// DTOs

export interface CreateTournamentDto {
  name: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  type: string;
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

export enum TournamentStatus {
  DRAFT = "draft",
  REGISTRATION_OPEN = "registration_open",
  REGISTRATION_CLOSED = "registration_closed",
  IN_PROGRESS = "in_progress",
  FINISHED = "finished",
  CANCELLED = "cancelled",
}