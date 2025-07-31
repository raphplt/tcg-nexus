import { TournamentStatus, TournamentType } from "@/utils/tournaments";

export interface Tournament {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: TournamentType;
  status: TournamentStatus;
}


export interface CreateTournamentDto {
  name: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  format: string;
  tournamentType: string;
  status?: string;
  isFinished?: boolean;
  isPublic?: boolean;
  allowLateRegistration?: boolean;
  requiresApproval?: boolean;
  maxPlayers?: number;
  minPlayers?: number;
  currentRound?: number;
  totalRounds?: number;
  rules?: string;
  additionalInfo?: string;
  ageRestrictionMin?: number;
  ageRestrictionMax?: number;
  allowedFormats?: string[];
}