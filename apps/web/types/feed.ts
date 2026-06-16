export type FeedEventType = "deck_created" | "tournament_joined";

export interface FeedActor {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface FeedDeckPayload {
  id: number;
  name: string;
  format?: { id: number; type: string } | null;
}

export interface FeedTournamentPayload {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export interface FeedItem {
  type: FeedEventType;
  createdAt: string;
  actor: FeedActor;
  deck?: FeedDeckPayload;
  tournament?: FeedTournamentPayload;
}
