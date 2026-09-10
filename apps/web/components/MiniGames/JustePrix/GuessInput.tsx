"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseEuroInput } from "@/utils/miniGames/pricing";

interface GuessInputProps {
  placeholder: string;
  submitLabel: string;
  onSubmit: (value: number) => void;
  /** Hides the typed digits, for the secret guesses of the local duel. */
  secret?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Euro amount field with validation. Accepts "12,50", "12.50" or "12,50 €";
 * refuses anything else with an inline message instead of ignoring the click.
 */
export function GuessInput({
  placeholder,
  submitLabel,
  onSubmit,
  secret = false,
  disabled = false,
  autoFocus = false,
}: GuessInputProps) {
  const t = useTranslations("JustePrix");
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();

  const submit = () => {
    const parsed = parseEuroInput(value);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setValue("");
    onSubmit(parsed);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type={secret ? "password" : "text"}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            if (invalid) setInvalid(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="h-12 border border-border bg-background font-semibold text-foreground"
        />
        <Button
          onClick={submit}
          disabled={disabled}
          className="h-12 px-6 font-semibold"
        >
          {submitLabel}
        </Button>
      </div>
      {invalid ? (
        <p id={errorId} className="text-xs font-semibold text-red-500">
          {t("invalidGuess")}
        </p>
      ) : null}
    </div>
  );
}
