import type {
  CaseOpeningPacksResponse,
  JustePrixItemsResponse,
  PackStyle,
} from "@/types/mini-game";
import { api } from "@/utils/fetch";

/** REST surface of the mini-games (solo and local modes). */
export const miniGameService = {
  /**
   * Draws priced items for a solo or local Juste Prix game.
   *
   * @param count Number of rounds.
   * @param setId Optional set restriction for the cards.
   */
  async getJustePrixItems(
    count: number,
    setId?: string,
  ): Promise<JustePrixItemsResponse> {
    const response = await api.get<JustePrixItemsResponse>(
      "/mini-game/juste-prix/items",
      { params: { count, setId: setId || undefined } },
    );
    return response.data;
  },

  /**
   * Draws the boosters of a solo or local Case Opening duel.
   *
   * @param options Rounds, players, scope (set wins over series) and style.
   */
  async getCaseOpeningPacks(options: {
    count: number;
    players: number;
    setId?: string;
    serieId?: string;
    style: PackStyle;
  }): Promise<CaseOpeningPacksResponse> {
    const response = await api.get<CaseOpeningPacksResponse>(
      "/mini-game/case-opening/packs",
      {
        params: {
          count: options.count,
          players: options.players,
          setId: options.setId || undefined,
          serieId: options.setId ? undefined : options.serieId || undefined,
          style: options.style,
        },
      },
    );
    return response.data;
  },
};
