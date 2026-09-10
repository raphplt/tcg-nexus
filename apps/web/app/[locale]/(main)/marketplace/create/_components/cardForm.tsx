"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Tag } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as z from "zod";
import { Button } from "@components/ui/button";
import { Card, CardContent } from "@components/ui/card";
import { Form } from "@components/ui/form";
import { SmartImage } from "@/components/ui/SmartImage";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { marketplaceService } from "@/services/marketplace.service";
import { pokemonCardService } from "@/services/pokemonCard.service";
import { PokemonCardType } from "@/types/cardPokemon";
import { Currency } from "@/utils/enums";
import { getCardImage } from "@/utils/images";
import {
  ListingFields,
  type ListingFieldsValues,
  useListingSchema,
} from "../../_components/ListingFields";
import { ListingCardPicker } from "./ListingCardPicker";

const LISTING_DURATION_MONTHS = 1;

/** Numbered section title guiding the seller through the two steps. */
const StepTitle = ({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) => (
  <h2 className="flex items-center gap-2 text-base font-semibold">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
      {step}
    </span>
    {children}
  </h2>
);

interface SelectedCardSummaryProps {
  card: PokemonCardType | null;
  onChange: () => void;
}

const SelectedCardSummary = ({ card, onChange }: SelectedCardSummaryProps) => {
  const t = useTranslations("CreateListing");

  if (!card) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        {t("noCardSelected")}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
      <div className="relative aspect-3/4 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        <SmartImage
          src={getCardImage(card, "low")}
          fallbackSrc="/images/carte-pokemon-dos.jpg"
          alt=""
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{card.name}</h3>
        <p className="truncate text-xs text-muted-foreground">
          <span>{card.set?.name}</span>
          {card.localId && <span> · #{card.localId}</span>}
        </p>
      </div>
      {/* From `lg` the picker stays visible next to the form. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="lg:hidden"
        onClick={onChange}
      >
        {t("changeCard")}
      </Button>
    </div>
  );
};

/** Lists a card for sale: pick it in the catalogue, then describe the offer. */
const CardForm = () => {
  const t = useTranslations("CreateListing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCardId = searchParams.get("cardId");
  const [selectedCard, setSelectedCard] = useState<PokemonCardType | null>(
    null,
  );
  // Below `lg`, the picker collapses once a card is chosen so the offer stays in view.
  const [isPickerOpen, setIsPickerOpen] = useState(true);
  const detailsRef = useRef<HTMLDivElement>(null);
  const schema = useListingSchema(true);

  const form = useForm<ListingFieldsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: Currency.EUR,
      quantityAvailable: 1,
      cardState: "NM",
      language: "fr",
      description: "",
    },
  });

  useEffect(() => {
    if (!initialCardId || !z.uuid().safeParse(initialCardId).success) {
      return;
    }

    let isActive = true;

    pokemonCardService
      .getById(initialCardId)
      .then((card) => {
        if (!isActive) return;
        setSelectedCard(card);
        setIsPickerOpen(false);
      })
      .catch(() => {
        // The regular picker remains available when a stale card link is used.
      });

    return () => {
      isActive = false;
    };
  }, [initialCardId]);

  const selectCard = (card: PokemonCardType) => {
    setSelectedCard(card);
    setIsPickerOpen(false);
    if (!window.matchMedia?.("(min-width: 1024px)").matches) {
      requestAnimationFrame(() =>
        detailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
  };

  const onSubmit = async (values: ListingFieldsValues) => {
    if (!selectedCard) return;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + LISTING_DURATION_MONTHS);

    try {
      await marketplaceService.createListing({
        ...values,
        pokemonCardId: selectedCard.id,
        description: values.description || undefined,
        expiresAt: expiresAt.toISOString(),
      });
      toast.success(t("success"));
      router.push(`/marketplace/cards/${selectedCard.id}`);
    } catch (error: unknown) {
      const response = (
        error as {
          response?: {
            status?: number;
            data?: { message?: string | string[] };
          };
        }
      ).response;
      if (response?.status === 401) {
        toast.error(t("sessionExpired"));
        router.push("/auth/login");
        return;
      }
      const message = response?.data?.message;
      toast.error(
        Array.isArray(message) ? message.join(", ") : message || t("error"),
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid items-start gap-4 pb-20 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0 xl:grid-cols-[minmax(0,1fr)_24rem]"
      >
        <Card
          className={cn(selectedCard && !isPickerOpen && "hidden lg:block")}
        >
          <CardContent className="space-y-3 p-3 sm:p-4">
            <StepTitle step={1}>{t("cardStep")}</StepTitle>
            <ListingCardPicker
              selectedCardId={selectedCard?.id}
              onSelect={selectCard}
            />
          </CardContent>
        </Card>

        <div
          ref={detailsRef}
          className={cn(
            "scroll-mt-4 lg:sticky lg:top-4",
            !selectedCard && "hidden lg:block",
          )}
        >
          <Card>
            <CardContent className="space-y-4 p-3 sm:p-4">
              <StepTitle step={2}>{t("listingStep")}</StepTitle>
              <SelectedCardSummary
                card={selectedCard}
                onChange={() => setIsPickerOpen(true)}
              />
              <ListingFields form={form} cardId={selectedCard?.id} />
              <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-background/95 p-3 backdrop-blur-sm lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                <Button type="button" variant="outline" asChild>
                  <Link href="/marketplace">{t("cancel")}</Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!selectedCard || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Tag className="h-4 w-4" />
                  )}
                  {t("submit")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
};

export default CardForm;
