import { authedFetch } from "@/utils/fetch";
import {
  TrainingActionResult,
  TrainingDifficulty,
  TrainingLobbyView,
  TrainingSessionView,
} from "@/types/training-match";

export interface TrainingActionInput {
  type: string;
  payload?: Record<string, unknown>;
}

export interface TrainingPromptResponseInput {
  promptId: string;
  selections?: string[];
  numericChoice?: number;
}

export interface CreateTrainingMatchInput {
  deckId: number;
  aiDeckPresetId: string;
  difficulty: TrainingDifficulty;
}

export const trainingMatchService = {
  async getLobby(): Promise<TrainingLobbyView> {
    return authedFetch<TrainingLobbyView>("GET", "/training-matches/lobby");
  },

  async createSession(
    payload: CreateTrainingMatchInput,
  ): Promise<TrainingSessionView> {
    return authedFetch<TrainingSessionView>("POST", "/training-matches", {
      data: payload,
    });
  },

  async getSession(sessionId: number): Promise<TrainingSessionView> {
    return authedFetch<TrainingSessionView>(
      "GET",
      `/training-matches/${sessionId}`,
    );
  },

  async dispatchAction(
    sessionId: number,
    action: TrainingActionInput,
  ): Promise<TrainingActionResult> {
    return authedFetch<TrainingActionResult>(
      "POST",
      `/training-matches/${sessionId}/action`,
      {
        data: { action },
      },
    );
  },

  async respondPrompt(
    sessionId: number,
    response: TrainingPromptResponseInput,
  ): Promise<TrainingActionResult> {
    return authedFetch<TrainingActionResult>(
      "POST",
      `/training-matches/${sessionId}/prompt`,
      {
        data: { response },
      },
    );
  },
};
