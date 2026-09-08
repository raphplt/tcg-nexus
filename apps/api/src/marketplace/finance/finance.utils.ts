import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";

/** Converts validated major-unit money to integer cents without silently rounding a request. */
export function moneyCents(value: number | string): number {
  const number = Number(value);
  const cents = Math.round(number * 100);
  if (
    !Number.isFinite(number) ||
    !Number.isSafeInteger(cents) ||
    Math.abs(number * 100 - cents) > 0.000001
  ) {
    throw new BadRequestException(
      "Amounts must have at most two decimal places",
    );
  }
  return cents;
}

/** Produces a stable fingerprint from an explicitly ordered request representation. */
export function financeFingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Converts supported currencies to provider minor units; JPY has no decimal unit. */
export function providerMinorUnits(
  amount: number | string,
  currency: string,
): number {
  const cents = moneyCents(amount);
  const units = currency.toUpperCase() === "JPY" ? cents / 100 : cents;
  if (!Number.isSafeInteger(units))
    throw new BadRequestException(
      "Amount has invalid precision for its currency",
    );
  return units;
}
