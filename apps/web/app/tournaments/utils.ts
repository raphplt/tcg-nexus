import { Match } from "@/types/tournament";
import { TournamentStatus, TournamentType } from "@/utils/tournaments";

export const statusColor: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [TournamentStatus.REGISTRATION_OPEN]: "default",
  [TournamentStatus.REGISTRATION_CLOSED]: "secondary",
  [TournamentStatus.IN_PROGRESS]: "destructive",
  [TournamentStatus.FINISHED]: "outline",
  [TournamentStatus.CANCELLED]: "secondary",
  [TournamentStatus.DRAFT]: "secondary",
};

export const typeColor: Record<string, "default" | "secondary" | "outline"> = {
  [TournamentType.SINGLE_ELIMINATION]: "default",
  [TournamentType.DOUBLE_ELIMINATION]: "secondary",
  [TournamentType.SWISS_SYSTEM]: "outline",
  [TournamentType.ROUND_ROBIN]: "outline",
};

export const statusOptions = [
  { label: "Tous", value: "" },
  { label: "Ouvert", value: "registration_open" },
  { label: "Fermé", value: "registration_closed" },
  { label: "En cours", value: "in_progress" },
  { label: "Terminé", value: "finished" },
  { label: "Annulé", value: "cancelled" },
  { label: "Brouillon", value: "draft" },
];

export const typeOptions = [
  { label: "Tous", value: "" },
  { label: "Standard", value: "single_elimination" },
  { label: "Double élimination", value: "double_elimination" },
  { label: "Système suisse", value: "swiss_system" },
  { label: "Round Robin", value: "round_robin" },
];

export const sortOptions = [
  { label: "Date de début", value: "startDate" },
  { label: "Nom", value: "name" },
  { label: "Lieu", value: "location" },
  { label: "Type", value: "type" },
  { label: "Statut", value: "status" },
];

export interface TabMatchesProps {
  matches: Match[];
  formatDate: (date?: string | null) => string;
  tournamentId?: number;
}

export const getPlayerName = (player: any): string => {
  if (!player) return "TBD";
  if (player.user) {
    return `${player.user.firstName} ${player.user.lastName}`;
  }
  return player.name || `Joueur #${player.id}`;
};
