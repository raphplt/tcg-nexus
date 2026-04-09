import type { LLMProvider } from "./providers/base.js";
import {
  getSystemPrompt,
  buildUserPrompt,
  type CardInput,
} from "./prompt-builder.js";
import { validateCardEffects } from "./validator.js";
import type { CardEffects } from "./schema.js";

export interface ParseResult {
  cardId: string;
  success: boolean;
  effects?: CardEffects;
  rawJSON?: string;
  error?: string;
}

export interface ParserOptions {
  maxRetries?: number;
  provider: LLMProvider;
}

export class EffectParser {
  private provider: LLMProvider;
  private maxRetries: number;
  private systemPrompt: string;

  constructor(opts: ParserOptions) {
    this.provider = opts.provider;
    this.maxRetries = opts.maxRetries ?? 2;
    this.systemPrompt = getSystemPrompt();
  }

  /**
   * Parse a batch of cards. Returns one result per card.
   */
  async parseBatch(cards: CardInput[]): Promise<ParseResult[]> {
    const userPrompt = buildUserPrompt(cards);

    let lastError = "";
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const promptToSend =
          attempt === 0
            ? userPrompt
            : `${userPrompt}\n\n⚠️ L'essai précédent a échoué avec l'erreur : ${lastError}\nCorrige le JSON et réessaie.`;

        const rawJSON = await this.provider.generateJSON(
          this.systemPrompt,
          promptToSend,
        );

        return this.parseResponse(rawJSON, cards);
      } catch (err: any) {
        lastError = err.message;
        if (attempt === this.maxRetries) {
          return cards.map((card) => ({
            cardId: card.id,
            success: false,
            error: `Failed after ${this.maxRetries + 1} attempts: ${lastError}`,
          }));
        }
      }
    }

    return []; // unreachable
  }

  /**
   * Parse a single card.
   */
  async parseCard(card: CardInput): Promise<ParseResult> {
    const results = await this.parseBatch([card]);
    return results[0]!;
  }

  private parseResponse(rawJSON: string, cards: CardInput[]): ParseResult[] {
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(rawJSON);
    } catch {
      throw new Error(`Invalid JSON response: ${rawJSON.slice(0, 200)}`);
    }

    return cards.map((card) => {
      const cardData = parsed[card.id];
      if (!cardData) {
        return {
          cardId: card.id,
          success: false,
          rawJSON,
          error: `Card ${card.id} not found in response`,
        };
      }

      const validation = validateCardEffects(cardData);
      if (!validation.success) {
        return {
          cardId: card.id,
          success: false,
          rawJSON: JSON.stringify(cardData),
          error: validation.error,
        };
      }

      return {
        cardId: card.id,
        success: true,
        effects: validation.data!,
        rawJSON: JSON.stringify(cardData),
      };
    });
  }
}
