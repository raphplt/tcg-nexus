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

export const tournamentTypeTranslation = {
  [TournamentType.SINGLE_ELIMINATION]: "Élimination directe",
  [TournamentType.DOUBLE_ELIMINATION]: "Double élimination",
  [TournamentType.SWISS_SYSTEM]: "Système suisse",
  [TournamentType.ROUND_ROBIN]: "Toutes rondes",
};

export const tournamentStatusTranslation = {
  [TournamentStatus.DRAFT]: "Brouillon",
  [TournamentStatus.REGISTRATION_OPEN]: "Inscriptions ouvertes",
  [TournamentStatus.REGISTRATION_CLOSED]: "Inscriptions fermées",
  [TournamentStatus.IN_PROGRESS]: "En cours",
  [TournamentStatus.FINISHED]: "Terminé",
  [TournamentStatus.CANCELLED]: "Annulé",
};

export const tournamentFormatTranslation = {
  [TournamentFormat.STANDARD]: "Standard",
  [TournamentFormat.EXPANDED]: "Étendu",
};
