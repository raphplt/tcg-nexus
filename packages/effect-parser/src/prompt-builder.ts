import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _systemPrompt: string | null = null;

export function getSystemPrompt(): string {
  if (!_systemPrompt) {
    _systemPrompt = readFileSync(
      resolve(__dirname, "../prompts/system-prompt.md"),
      "utf-8",
    );
  }
  return _systemPrompt;
}

export interface CardInput {
  id: string;
  name: string;
  category: "Pokémon" | "Dresseur" | "Énergie";
  // Pokemon fields
  types?: string[];
  hp?: number;
  stage?: string;
  attacks?: {
    name: string;
    cost: string[];
    damage?: string | number;
    effect?: string;
  }[];
  ability?: {
    name: string;
    effect: string;
  };
  retreat?: number;
  // Trainer fields
  trainerType?: string;
  effect?: string;
}

export function buildUserPrompt(cards: CardInput[]): string {
  const sections = cards.map((card) => {
    if (card.category === "Pokémon") {
      return buildPokemonPrompt(card);
    }
    if (card.category === "Dresseur") {
      return buildTrainerPrompt(card);
    }
    return null;
  });

  return sections.filter(Boolean).join("\n---\n\n");
}

function buildPokemonPrompt(card: CardInput): string {
  let prompt = `CARTE POKÉMON:\n`;
  prompt += `  ID: ${card.id}\n`;
  prompt += `  Nom: ${card.name}\n`;
  prompt += `  Type: ${card.types?.join(", ") ?? "?"}\n`;
  prompt += `  PV: ${card.hp ?? "?"}\n`;
  prompt += `  Stade: ${card.stage ?? "De base"}\n`;
  if (card.retreat !== undefined) {
    prompt += `  Coût de Retraite: ${card.retreat}\n`;
  }

  if (card.ability) {
    prompt += `\n  TALENT: "${card.ability.name}"\n`;
    prompt += `    Texte: "${card.ability.effect}"\n`;
  }

  if (card.attacks?.length) {
    for (const atk of card.attacks) {
      prompt += `\n  ATTAQUE: "${atk.name}"\n`;
      prompt += `    Coût: [${atk.cost.join(", ")}]\n`;
      if (atk.damage !== undefined) {
        prompt += `    Dégâts: ${atk.damage}\n`;
      }
      if (atk.effect) {
        prompt += `    Texte: "${atk.effect}"\n`;
      }
    }
  }

  return prompt;
}

function buildTrainerPrompt(card: CardInput): string {
  let prompt = `CARTE DRESSEUR:\n`;
  prompt += `  ID: ${card.id}\n`;
  prompt += `  Nom: ${card.name}\n`;
  prompt += `  Sous-type: ${card.trainerType ?? "Objet"}\n`;
  prompt += `  Texte: "${card.effect ?? ""}"\n`;
  return prompt;
}
