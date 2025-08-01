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