import { Match } from "@/types/tournament";
import {
  TournamentFormat,
  TournamentStatus,
  TournamentType,
} from "@/utils/tournaments";
import z from "zod";

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
  tournamentId?: number;
}

export const getPlayerName = (player: any): string => {
  if (!player) return "TBD";
  if (player.user) {
    return `${player.user.firstName} ${player.user.lastName}`;
  }
  return player.name || `Joueur #${player.id}`;
};

export const formSchema = z
  .object({
    name: z.string().min(3, "Le nom est requis"),
    description: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().min(1, "Date de début requise"),
    endDate: z.string().min(1, "Date de fin requise"),
    registrationDeadline: z.string().optional(),
    format: z.nativeEnum(TournamentFormat),
    type: z.nativeEnum(TournamentType),
    status: z.nativeEnum(TournamentStatus).optional(),
    isFinished: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    allowLateRegistration: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    maxPlayers: z.number().int().positive().optional(),
    minPlayers: z.number().int().positive().optional(),
    currentRound: z.number().int().min(0).optional(),
    totalRounds: z.number().int().min(0).optional(),
    rules: z.string().optional(),
    additionalInfo: z.string().optional(),
    ageRestrictionMin: z.number().min(0).optional(),
    ageRestrictionMax: z.number().min(0).optional(),
    allowedFormats: z.array(z.string()).optional(),
    fillWithPlayers: z.boolean().optional(),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"],
  });

export type FormValues = z.infer<typeof formSchema>;