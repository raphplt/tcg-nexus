import { DeckAnalysis } from "@/types/deck-analysis";

export interface DeckScore {
  key: "synergy" | "curve" | "diversity" | "consistency" | "energyBalance";
  label: string;
  value: number;
  hint: string;
}

export interface DeckScoreSummary {
  global: number;
  scores: DeckScore[];
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const round = (value: number) => Math.round(value);

function computeDiversity(analysis: DeckAnalysis): number {
  const typeCount = analysis.typeDistribution.length;
  if (typeCount === 0) return 0;
  if (typeCount <= 2) return 100;
  if (typeCount === 3) return 75;
  if (typeCount === 4) return 50;
  return 30;
}

function computeSynergy(analysis: DeckAnalysis): number {
  if (analysis.totalCards === 0) return 0;

  const topType = analysis.typeDistribution[0];
  const topShare = topType ? topType.percentage : 0;

  let synergy = 0;
  if (topShare >= 70) synergy = 100;
  else if (topShare >= 50) synergy = 85;
  else if (topShare >= 35) synergy = 65;
  else if (topShare >= 20) synergy = 45;
  else synergy = 25;

  const duplicateExcess = analysis.duplicates.reduce(
    (acc, dup) => acc + Math.max(0, dup.qty - 4),
    0,
  );
  synergy -= duplicateExcess * 10;

  return clamp(synergy);
}

function computeCurve(analysis: DeckAnalysis): number {
  const avg = analysis.averageEnergyCost;
  if (avg <= 0) return 50;
  const distance = Math.abs(avg - 2);
  return clamp(100 - distance * 25);
}

function computeConsistency(analysis: DeckAnalysis): number {
  if (analysis.totalCards === 0) return 0;
  const trainerRatio = analysis.trainerCount / analysis.totalCards;
  const distance = Math.abs(trainerRatio - 0.4);
  let score = 100 - distance * 250;
  if (analysis.totalCards !== 60) score -= 20;
  return clamp(score);
}

function computeEnergyBalance(analysis: DeckAnalysis): number {
  if (analysis.pokemonCount === 0) return 0;
  const ratio = analysis.energyToPokemonRatio;
  const distance = Math.abs(ratio - 1);
  return clamp(100 - distance * 60);
}

export function computeDeckScores(analysis: DeckAnalysis): DeckScoreSummary {
  const synergy = round(computeSynergy(analysis));
  const curve = round(computeCurve(analysis));
  const diversity = round(computeDiversity(analysis));
  const consistency = round(computeConsistency(analysis));
  const energyBalance = round(computeEnergyBalance(analysis));

  const scores: DeckScore[] = [
    {
      key: "synergy",
      label: "Synergie",
      value: synergy,
      hint: "Cohérence des types et combos détectés",
    },
    {
      key: "curve",
      label: "Courbe",
      value: curve,
      hint: "Coût moyen des attaques (idéal ≈ 2)",
    },
    {
      key: "diversity",
      label: "Diversité",
      value: diversity,
      hint: "Nombre de types représentés",
    },
    {
      key: "consistency",
      label: "Consistance",
      value: consistency,
      hint: "Proportion de cartes Dresseur (idéal ≈ 40%)",
    },
    {
      key: "energyBalance",
      label: "Équilibre énergie",
      value: energyBalance,
      hint: "Ratio Énergies / Pokémon (idéal ≈ 1)",
    },
  ];

  const global = round(
    scores.reduce((sum, s) => sum + s.value, 0) / scores.length,
  );

  return { global, scores };
}

export function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 75) return "good";
  if (score >= 50) return "warn";
  return "bad";
}
