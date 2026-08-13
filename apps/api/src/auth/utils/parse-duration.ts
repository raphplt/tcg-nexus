/**
 * Converts a duration string formatted for JWT (`15m`, `1h`, `30d`, `45s`) or numeric seconds into milliseconds.
 *
 * @param value Duration string or numeric value in seconds.
 * @returns Equivalent duration in milliseconds.
 * @throws Error if the duration format cannot be parsed.
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
      `parseDurationToMs: invalid duration format "${value}" (expected: 15m, 1h, 30d, etc.)`,
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
