import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import type { CardInput } from "./prompt-builder.js";

// ─── CSV Row types ───────────────────────────────────────────

interface CardRow {
  id: string;
  tcgDexId: string;
  name: string;
  category: string;
}

interface DetailsRow {
  card_id: string;
  category: string;
  hp: string;
  types: string;
  stage: string;
  suffix: string;
  evolveFrom: string;
  effect: string;
  attacks: string;
  abilities: string;
  weaknesses: string;
  resistances: string;
  retreat: string;
  trainerType: string;
  energyType: string;
}

interface ParsedAttack {
  name: string;
  cost: string[];
  damage?: string | number;
  effect?: string;
}

interface ParsedAbility {
  name: string;
  type?: string;
  effect?: string;
}

// ─── CSV Loading ─────────────────────────────────────────────

function loadCSV<T>(filePath: string): T[] {
  const content = readFileSync(filePath, "utf-8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    quote: '"',
    escape: '"',
  }) as T[];
}

function tryParseJSON<T>(value: string | undefined): T | null {
  if (!value || value === "" || value === "null") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    // Try fixing common CSV-escaped JSON issues
    try {
      const fixed = value.replace(/""/g, '"');
      return JSON.parse(fixed) as T;
    } catch {
      return null;
    }
  }
}

// ─── Main pipeline ───────────────────────────────────────────

export interface PipelineOptions {
  cardsCsvPath: string;
  detailsCsvPath: string;
  outputPath: string;
  /** Only export cards that have at least one attack/ability with effect text */
  filterWithEffects?: boolean;
}

export function loadCardsFromCSV(opts: PipelineOptions): CardInput[] {
  console.log("Loading card.csv...");
  const cards = loadCSV<CardRow>(opts.cardsCsvPath);
  console.log(`  ${cards.length} cards loaded`);

  console.log("Loading pokemon_card_details.csv...");
  const details = loadCSV<DetailsRow>(opts.detailsCsvPath);
  console.log(`  ${details.length} details loaded`);

  // Index details by card_id
  const detailsMap = new Map<string, DetailsRow>();
  for (const d of details) {
    detailsMap.set(d.card_id, d);
  }

  // Join and transform
  const cardInputs: CardInput[] = [];

  for (const card of cards) {
    const detail = detailsMap.get(card.id);
    if (!detail) continue;

    const category = mapCategory(card.category);
    if (!category) continue;

    // Parse JSON fields
    const attacks = tryParseJSON<ParsedAttack[]>(detail.attacks);
    const abilities = tryParseJSON<ParsedAbility[]>(detail.abilities);
    const types = tryParseJSON<string[]>(detail.types);

    // Filter: skip cards with no effect text to parse
    if (opts.filterWithEffects !== false) {
      const hasAttackEffect = attacks?.some((a) => a.effect) ?? false;
      const hasAbilityEffect =
        abilities?.some((a) => a.effect) ?? false;
      const hasTrainerEffect =
        category === "Dresseur" && !!detail.effect;

      if (!hasAttackEffect && !hasAbilityEffect && !hasTrainerEffect) {
        continue;
      }
    }

    const input: CardInput = {
      id: card.tcgDexId || card.id,
      name: card.name,
      category,
    };

    if (category === "Pokémon") {
      input.types = types ?? undefined;
      input.hp = detail.hp ? Number(detail.hp) : undefined;
      input.stage = detail.stage || undefined;
      input.retreat = detail.retreat
        ? Number(detail.retreat)
        : undefined;

      if (attacks?.length) {
        input.attacks = attacks.map((a) => ({
          name: a.name,
          cost: a.cost || [],
          damage: a.damage,
          effect: a.effect,
        }));
      }

      if (abilities?.length) {
        const ability = abilities[0];
        if (ability?.name && ability?.effect) {
          input.ability = {
            name: ability.name,
            effect: ability.effect,
          };
        }
      }
    }

    if (category === "Dresseur") {
      input.trainerType = detail.trainerType || undefined;
      input.effect = detail.effect || undefined;
    }

    cardInputs.push(input);
  }

  return cardInputs;
}

function mapCategory(
  cat: string,
): "Pokémon" | "Dresseur" | "Énergie" | null {
  if (cat === "Pokémon" || cat === "Pokemon") return "Pokémon";
  if (cat === "Dresseur" || cat === "Trainer") return "Dresseur";
  if (cat === "Énergie" || cat === "Energy") return "Énergie";
  return null;
}

// ─── Export for CLI ──────────────────────────────────────────

export function exportCardInputsToJSON(opts: PipelineOptions): void {
  const cardInputs = loadCardsFromCSV(opts);

  console.log(
    `\n${cardInputs.length} cards with parseable effects`,
  );

  const byCategory = {
    pokemon: cardInputs.filter((c) => c.category === "Pokémon").length,
    trainer: cardInputs.filter((c) => c.category === "Dresseur").length,
    energy: cardInputs.filter((c) => c.category === "Énergie").length,
  };
  console.log(
    `  Pokémon: ${byCategory.pokemon} | Dresseur: ${byCategory.trainer} | Énergie: ${byCategory.energy}`,
  );

  writeFileSync(
    resolve(opts.outputPath),
    JSON.stringify(cardInputs, null, 2),
  );
  console.log(`\nExported to: ${opts.outputPath}`);
}
