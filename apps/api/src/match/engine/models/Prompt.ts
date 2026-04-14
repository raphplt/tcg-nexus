import { PromptType } from "./enums";

export interface PromptOption {
  value: string;
  label: string;
  description?: string;
  image?: string;
}

export interface PendingPrompt {
  id: string;
  type: PromptType;
  playerId: string;
  title: string;
  minSelections: number;
  maxSelections: number;
  allowPass: boolean;
  options: PromptOption[];
  metadata?: Record<string, unknown>;
}

export interface PromptResponse {
  promptId: string;
  selections?: string[];
  numericChoice?: number;
}
