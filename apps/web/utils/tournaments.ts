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

export enum TournamentFormat {
  STANDARD = "standard",
  EXPANDED = "expanded",
}

// Traductions
export const tournamentTypeTranslation = {
  [TournamentType.SINGLE_ELIMINATION]: "Elimination simple",
  [TournamentType.DOUBLE_ELIMINATION]: "Elimination double",
  [TournamentType.SWISS_SYSTEM]: "Système suisse",
  [TournamentType.ROUND_ROBIN]: "Tournoi en round robin",
};

export const tournamentStatusTranslation = {
  [TournamentStatus.DRAFT]: "Brouillon",
  [TournamentStatus.REGISTRATION_OPEN]: "Inscription ouverte",
  [TournamentStatus.REGISTRATION_CLOSED]: "Inscription fermée",
  [TournamentStatus.IN_PROGRESS]: "En cours",
  [TournamentStatus.FINISHED]: "Terminé",
  [TournamentStatus.CANCELLED]: "Annulé",
};

export const tournamentFormatTranslation = {
  [TournamentFormat.STANDARD]: "Standard",
  [TournamentFormat.EXPANDED]: "Étendu",
};
