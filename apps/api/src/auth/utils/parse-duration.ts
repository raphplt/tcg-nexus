/**
 * Convertit une durée au format JWT (`15m`, `1h`, `30d`, `45s`) en millisecondes.
 *
 * Si `value` est un nombre brut, il est interprété comme un nombre de secondes
 * (comportement par défaut de la librairie `jsonwebtoken`).
 *
 * Lance une erreur si le format n'est pas reconnu : on préfère échouer fort
 * plutôt que de calculer des expirations silencieusement fausses.
 */
export function parseDurationToMs(value: string | number): number {
  if (typeof value === "number") {
    return value * 1000;
  }

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  const match = trimmed.match(/^(\d+)\s*(ms|s|m|h|d|w|y)$/i);
  if (!match) {
    throw new Error(
      `parseDurationToMs: format de durée invalide "${value}" (attendu: 15m, 1h, 30d, etc.)`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}
