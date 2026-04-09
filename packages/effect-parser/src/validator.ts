import {
  CardEffectsSchema,
  type CardEffects,
  CardEffectsRegistrySchema,
  type CardEffectsRegistry,
} from "./schema.js";

export interface ValidationResult {
  success: boolean;
  data?: CardEffects;
  error?: string;
}

export interface RegistryValidationResult {
  success: boolean;
  data?: CardEffectsRegistry;
  errors?: { cardId: string; error: string }[];
}

/**
 * Validate a single card's parsed effects against the Zod schema.
 */
export function validateCardEffects(data: unknown): ValidationResult {
  const result = CardEffectsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { success: false, error: errors };
}

/**
 * Validate an entire registry (record of cardId → CardEffects).
 */
export function validateRegistry(data: unknown): RegistryValidationResult {
  const result = CardEffectsRegistrySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => ({
    cardId: String(issue.path[0] ?? "unknown"),
    error: `${issue.path.slice(1).join(".")}: ${issue.message}`,
  }));

  return { success: false, errors };
}

/**
 * Coherence checks beyond schema validation.
 */
export function checkCoherence(cardId: string, effects: CardEffects): string[] {
  const warnings: string[] = [];

  if (effects.kind === "pokemon") {
    for (const [atkName, atk] of Object.entries(effects.attacks)) {
      for (const eff of atk.effects) {
        // DAMAGE to SELF is unusual — might be a parsing error
        if (
          eff.type === "DAMAGE" &&
          eff.target === "SELF" &&
          eff.amount > 100
        ) {
          warnings.push(
            `[${cardId}] ${atkName}: DAMAGE to SELF with amount ${eff.amount} seems high`,
          );
        }

        // HEAL to OPPONENT is unusual
        if (eff.type === "HEAL" && eff.target === "OPPONENT_ACTIVE") {
          warnings.push(
            `[${cardId}] ${atkName}: HEAL targeting OPPONENT_ACTIVE is unusual`,
          );
        }
      }
    }
  }

  return warnings;
}
