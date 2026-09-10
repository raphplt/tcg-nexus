"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useId, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { cardStates, currencyOptions, languages } from "@/utils/variables";
import { PriceSuggestionHint } from "./PriceSuggestionHint";
import { ShippingPolicyNotice } from "./ShippingPolicyNotice";

const optionValues = (options: { value: string }[]) =>
  options.map((option) => option.value) as [string, ...string[]];

interface ListingSchemaMessages {
  price: string;
  quantity: string;
  condition: string;
  description: string;
}

/** Validation shared by listing creation and edition; card listings must state a condition. */
export const buildListingSchema = (
  messages: ListingSchemaMessages,
  requireCondition: boolean,
) =>
  z
    .object({
      price: z.number({ message: messages.price }).positive(messages.price),
      currency: z.enum(optionValues(currencyOptions)),
      quantityAvailable: z
        .number({ message: messages.quantity })
        .int(messages.quantity)
        .min(1, messages.quantity),
      cardState: z.enum(optionValues(cardStates)).optional(),
      language: z.enum(optionValues(languages)),
      description: z.string().max(1000, messages.description).optional(),
    })
    .superRefine((listing, ctx) => {
      if (requireCondition && !listing.cardState) {
        ctx.addIssue({
          code: "custom",
          path: ["cardState"],
          message: messages.condition,
        });
      }
    });

export type ListingFieldsValues = z.infer<
  ReturnType<typeof buildListingSchema>
>;

/** Returns the listing schema with messages in the current locale. */
export function useListingSchema(requireCondition: boolean) {
  const t = useTranslations("ListingForm");
  return useMemo(
    () =>
      buildListingSchema(
        {
          price: t("priceInvalid"),
          quantity: t("quantityInvalid"),
          condition: t("conditionRequired"),
          description: t("descriptionTooLong"),
        },
        requireCondition,
      ),
    [t, requireCondition],
  );
}

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="text-sm font-medium text-destructive">{message}</p>
  ) : null;

interface ListingFieldsProps {
  form: UseFormReturn<ListingFieldsValues>;
  productKind?: "card" | "sealed";
  /** Card being listed, used for the price suggestion. */
  cardId?: string;
  /** Extra controls placed in the main grid, such as a visibility toggle. */
  children?: React.ReactNode;
}

/** Price, quantity, condition, language and description of a marketplace listing. */
export function ListingFields({
  form,
  productKind = "card",
  cardId,
  children,
}: ListingFieldsProps) {
  const t = useTranslations("ListingForm");
  const id = useId();
  const isCard = productKind === "card";
  const { errors } = form.formState;
  const watchedQuantity = form.watch("quantityAvailable");
  const quantity = Number.isFinite(watchedQuantity) ? watchedQuantity : 1;

  const setQuantity = (next: number) =>
    form.setValue("quantityAvailable", Math.max(1, next), {
      shouldDirty: true,
      shouldValidate: true,
    });

  return (
    <div className="@container space-y-5">
      <div className="grid gap-4 @md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor={`${id}-price`}
            className={cn(errors.price && "text-destructive")}
          >
            {t("price")}
          </Label>
          <div className="flex gap-2">
            {/* Registered rather than controlled so partial decimals such as "12." survive typing. */}
            <Input
              id={`${id}-price`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={Boolean(errors.price)}
              className="h-9 min-w-0 flex-1 tabular-nums"
              {...form.register("price", { valueAsNumber: true })}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    aria-label={t("currency")}
                    className="w-24 shrink-0"
                  >
                    <SelectValue>{field.value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value}
                        <span className="text-muted-foreground">
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {isCard && (
            <PriceSuggestionHint
              cardId={cardId}
              cardState={form.watch("cardState")}
              currency={form.watch("currency")}
              onApply={(price) =>
                form.setValue("price", price, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
          )}
          <FieldError message={errors.price?.message} />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor={`${id}-quantity`}
            className={cn(errors.quantityAvailable && "text-destructive")}
          >
            {t("quantity")}
          </Label>
          <div className="flex h-9 overflow-hidden rounded-md border border-input shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-full rounded-none px-3"
              aria-label={t("decrease")}
              disabled={quantity <= 1}
              onClick={() => setQuantity(quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id={`${id}-quantity`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              aria-invalid={Boolean(errors.quantityAvailable)}
              className="h-full min-w-0 flex-1 rounded-none border-0 text-center tabular-nums shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              {...form.register("quantityAvailable", { valueAsNumber: true })}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-full rounded-none px-3"
              aria-label={t("increase")}
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FieldError message={errors.quantityAvailable?.message} />
        </div>

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("language")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {children}
      </div>

      {isCard && (
        <FormField
          control={form.control}
          name="cardState"
          render={({ field }) => (
            <FormItem>
              <FormLabel id={`${id}-condition`}>{t("condition")}</FormLabel>
              <div
                role="radiogroup"
                aria-labelledby={`${id}-condition`}
                className="grid grid-cols-3 gap-1.5 @md:grid-cols-6"
              >
                {cardStates.map((state) => {
                  const checked = field.value === state.value;
                  return (
                    <button
                      key={state.value}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      aria-label={state.label}
                      onClick={() => field.onChange(state.value)}
                      className={cn(
                        "flex min-w-0 flex-col items-center rounded-md border px-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary/50 hover:bg-muted",
                      )}
                    >
                      <span className="text-sm font-semibold leading-none">
                        {state.value}
                      </span>
                      {state.label !== state.value && (
                        <span
                          className={cn(
                            "mt-1 w-full truncate text-center text-[10px] leading-none",
                            checked
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {state.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("description")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("optional")})
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                maxLength={1000}
                placeholder={t("descriptionPlaceholder")}
                className="resize-none"
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <ShippingPolicyNotice productKind={productKind} />
    </div>
  );
}
