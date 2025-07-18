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
