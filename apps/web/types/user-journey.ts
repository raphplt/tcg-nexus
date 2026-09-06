export type JourneyActionPriority = "HIGH" | "MEDIUM" | "LOW";

export interface ActionableJourneyItem {
  id: string;
  type:
    | "CHECKOUT_PENDING"
    | "RECEIPT_IMPORT_PENDING"
    | "TOURNAMENT_CHECKIN_REQUIRED"
    | "MATCH_SCORE_PENDING"
    | "DECK_MISSING_CARDS";
  title: string;
  description: string;
  priority: JourneyActionPriority;
  actionUrl: string;
  actionLabel: string;
  entityType?: string;
  entityId?: string | number;
}

export interface UserJourneyNextActions {
  userId: number;
  actions: ActionableJourneyItem[];
  totalActionableCount: number;
  generatedAt: string;
}
