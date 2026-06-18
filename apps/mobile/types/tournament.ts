// export * from "./index"; // Player is not exported from index
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

export interface Tournament {
  id: number;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  type: TournamentType;
  status: TournamentStatus;
  isFinished?: boolean;
  maxPlayers?: number;
  minPlayers?: number;
  currentRound?: number;
  totalRounds?: number;
  registrationDeadline?: string;
  allowLateRegistration?: boolean;
  requiresApproval: boolean;
  rules: string;
  additionalInfo: string;
  ageRestrictionMin: number;
  ageRestrictionMax: number;
  allowedFormats: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations that might be included
  players?: any[]; // Replace any with Player if available
  registrations?: any[];
  matches?: any[];
  rankings?: any[];
  rewards?: any[];
  pricing?: any;
  organizers?: any[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface TournamentQueryDto {
  search?: string;
  status?: TournamentStatus;
  type?: TournamentType;
  location?: string;
  isPublic?: boolean;
  startDateFrom?: string;
  startDateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}
