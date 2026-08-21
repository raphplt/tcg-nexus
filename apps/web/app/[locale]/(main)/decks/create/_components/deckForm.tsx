"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@components/ui/form";
import { Button } from "@components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@components/ui/sheet";
import { ArrowLeft, ArrowRight, ListChecks, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { decksService } from "@/services/decks.service";
import { collectionService } from "@/services/collection.service";
import { DeckFormProps } from "@/types/formDeck";
import { PokemonCardType } from "@/types/cardPokemon";
import { useDebounce } from "@/hooks/useDebounce";
import { FilterState, useMarketplaceCards } from "@/hooks/useMarketplace";
import { DeckCard } from "@/types/deck-cards";
import type { Collection } from "@/types/collection";
import { DeckFormValues, FormSchema, AddedCard } from "./deckForm.schema";
import { DeckInfoSection } from "./form-parts/DeckInfoSection";
import { DeckStatsSection } from "./form-parts/DeckStatsSection";
import {
  CardFilterSection,
  type CardSource,
} from "./form-parts/CardFilterSection";
import { CardListSection } from "./form-parts/CardListSection";
import { SelectedCardsSection } from "./form-parts/SelectedCardsSection";

/** Builds or edits a deck through a searchable catalogue and live deck list. */
export const DeckForm: React.FC<DeckFormProps> = ({ formats, deck }) => {
  const t = useTranslations("DeckForm");
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cardsMap, setCardsMap] = useState<AddedCard[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [cardSource, setCardSource] = useState<CardSource>("catalog");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sortBy: "localId",
    sortOrder: "DESC",
  });

  const [qtyByCard, setQtyByCard] = useState<Record<string, number>>({});
  const [roleByCard, setRoleByCard] = useState<Record<string, string>>({});

  const filtersWithSearch = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );
  const {
    data: catalogData,
    sets,
    series,
    isLoading: catalogLoading,
  } = useMarketplaceCards(
    filtersWithSearch,
    page,
    12,
    cardSource === "catalog",
  );

  const { data: collections = [], isLoading: collectionsLoading } = useQuery<
    Collection[]
  >({
    queryKey: ["deck-builder-collections", user?.id],
    queryFn: collectionService.getMyCollections,
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!selectedCollectionId && collections[0]) {
      setSelectedCollectionId(String(collections[0].id));
    }
  }, [collections, selectedCollectionId]);

  const { data: collectionData, isLoading: collectionCardsLoading } = useQuery({
    queryKey: [
      "deck-builder-collection-cards",
      selectedCollectionId,
      page,
      debouncedSearch,
    ],
    queryFn: () =>
      collectionService.getItemsPaginated(selectedCollectionId, {
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        ownedOnly: true,
        cardsOnly: true,
      }),
    enabled: cardSource === "collection" && Boolean(selectedCollectionId),
  });

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      formatId: 0,
      isPublic: false,
      cards: [],
    },
  });

  const syncFormCards = useCallback(
    (cards: AddedCard[]) => {
      form.setValue(
        "cards",
        cards.map((c) => ({
          cardId: c.cardId ?? "",
          qty: c.qty,
          role: c.role,
        })),
      );
    },
    [form],
  );

  useEffect(() => {
    if (deck) {
      form.reset({
        name: deck.name,
        formatId: deck.format?.id || (formats.length > 0 ? formats[0]?.id : 0),
        isPublic: deck.isPublic,
        cards: [],
      });

      if (deck.cards) {
        const mappedCards: AddedCard[] = deck.cards.map((c: DeckCard) => ({
          id: c.id,
          cardId: c.card?.id,
          qty: c.qty,
          role: c.role,
          card: c.card,
        }));
        setCardsMap(mappedCards);
        syncFormCards(mappedCards);
      }
    } else if (formats.length > 0 && form.getValues("formatId") === 0) {
      form.setValue("formatId", formats[0]?.id || 0);
    }
  }, [deck, formats, form, syncFormCards]);

  const collectionCards = useMemo(
    () =>
      (collectionData?.data ?? [])
        .map((item) => item.pokemonCard)
        .filter((card): card is PokemonCardType => Boolean(card)),
    [collectionData?.data],
  );
  const ownedQuantityByCard = useMemo(
    () =>
      (collectionData?.data ?? []).reduce<Record<string, number>>(
        (quantities, item) => {
          if (item.pokemonCard?.id) {
            quantities[item.pokemonCard.id] = item.quantity;
          }
          return quantities;
        },
        {},
      ),
    [collectionData?.data],
  );

  const allCards =
    cardSource === "catalog" ? catalogData?.data || [] : collectionCards;
  const meta =
    cardSource === "catalog" ? catalogData?.meta : collectionData?.meta;
  const cardsLoading =
    cardSource === "catalog"
      ? catalogLoading
      : collectionsLoading || collectionCardsLoading;

  const activeFiltersCount =
    (debouncedSearch ? 1 : 0) +
    (filters.setId ? 1 : 0) +
    (filters.serieId ? 1 : 0) +
    (filters.energyType ? 1 : 0) +
    (filters.rarity ? 1 : 0) +
    (filters.priceMin !== undefined ? 1 : 0) +
    (filters.priceMax !== undefined ? 1 : 0);

  const mainCount = cardsMap
    .filter((c) => c.role === "main")
    .reduce((acc, c) => acc + c.qty, 0);
  const sideCount = cardsMap
    .filter((c) => c.role === "side")
    .reduce((acc, c) => acc + c.qty, 0);
  const deckQuantityByCard = useMemo(
    () =>
      cardsMap.reduce<Record<string, number>>((quantities, card) => {
        if (card.cardId) {
          quantities[card.cardId] = (quantities[card.cardId] ?? 0) + card.qty;
        }
        return quantities;
      }, {}),
    [cardsMap],
  );

  useEffect(() => {
    setPage(1);
  }, [filtersWithSearch, cardSource, selectedCollectionId]);

  const addCard = (card: PokemonCardType, qty: number, role: string) => {
    if (!card.id) return;
    const targetQty = Math.max(1, qty || 1);
    setQtyByCard((prev) => ({ ...prev, [card.id!]: 1 }));
    setCardsMap((prev) => {
      const existing = prev.find(
        (c) => c.cardId === card.id && c.role === role,
      );
      const updated = existing
        ? prev.map((c) =>
            c.cardId === card.id && c.role === role
              ? { ...c, qty: c.qty + targetQty, card }
              : c,
          )
        : [
            ...prev,
            {
              cardId: card.id,
              qty: targetQty,
              role,
              card,
            },
          ];
      syncFormCards(updated);
      return updated;
    });
  };

  const updateCardQty = (cardId: string, role: string, qty: number) => {
    const parsedQty = Math.max(1, qty || 1);
    setCardsMap((prev) => {
      const updated = prev.map((c) =>
        c.cardId === cardId && c.role === role ? { ...c, qty: parsedQty } : c,
      );
      syncFormCards(updated);
      return updated;
    });
  };

  const removeCard = (cardId?: string, role?: string) => {
    setCardsMap((prev) => {
      const filtered = prev.filter(
        (c) => !(c.cardId === cardId && (!role || c.role === role)),
      );
      syncFormCards(filtered);
      return filtered;
    });
  };

  const onSubmit = async (data: DeckFormValues) => {
    if (!user) return;
    setLoading(true);

    try {
      if (deck) {
        const currentCards = cardsMap;
        const initialCards = deck.cards || [];

        const cardsToRemove = initialCards
          .filter(
            (initial) => !currentCards.some((curr) => curr.id === initial.id),
          )
          .filter((c) => c.id !== undefined)
          .map((c) => ({ id: c.id as number }));

        const cardsToUpdate = currentCards
          .filter((c) => c.id !== undefined)
          .map((c) => {
            const initial = initialCards.find((init) => init.id === c.id);
            if (initial && (initial.qty !== c.qty || initial.role !== c.role)) {
              return {
                id: c.id!,
                qty: c.qty,
                role: c.role,
              } as unknown as DeckCard;
            }
            return null;
          })
          .filter((c) => c !== null) as DeckCard[];

        const cardsToAdd = currentCards
          .filter((c) => c.id === undefined)
          .map((c) => ({
            cardId: c.cardId!,
            qty: c.qty,
            role: c.role,
          }));

        const updatePayload = {
          deckName: data.name,
          formatId: String(data.formatId),
          isPublic: !!data.isPublic,
          cardsToAdd,
          cardsToRemove,
          cardsToUpdate,
        };

        const response = await decksService.update(deck.id, updatePayload);
        if (response) {
          toast.success(t("updated"));
          router.push(`/decks/${deck.id}`);
        }
      } else {
        // Create logic
        const sourceCards =
          data.cards && data.cards.length > 0
            ? data.cards
            : cardsMap.map((cm) => ({
                cardId: cm.cardId,
                qty: cm.qty,
                role: cm.role,
              }));

        const cardsPayload = sourceCards
          .filter((c) => !!c.cardId)
          .map((c) => ({
            cardId: String(c.cardId),
            qty: c.qty,
            role: c.role,
          }));

        const creationData = {
          deckName: data.name,
          formatId: data.formatId,
          isPublic: !!data.isPublic,
          cards: cardsPayload,
        };
        const response = await decksService.create(creationData);
        if (response) {
          toast.success(t("created"));
          form.reset({
            name: "",
            formatId: 0,
            isPublic: false,
            cards: [],
          });
          router.push(`/decks/${(response as any).id}`);
        }
      }
    } catch (err: any) {
      console.error("Deck operation error:", err);
      const backendMessage = err?.response?.data?.message;
      let toastMsg = deck ? t("updateError") : t("createError");
      if (backendMessage) {
        if (Array.isArray(backendMessage)) {
          toastMsg = backendMessage.join(". ");
        } else if (typeof backendMessage === "string") {
          toastMsg = backendMessage;
        }
      }
      toast.error(toastMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 pb-16 xl:pb-1"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <DeckInfoSection form={form} formats={formats} isEditMode={!!deck} />

          <DeckStatsSection
            cards={cardsMap}
            mainCount={mainCount}
            sideCount={sideCount}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <CardFilterSection
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            filters={filters}
            setFilters={setFilters}
            activeFiltersCount={activeFiltersCount}
            series={series}
            sets={sets}
            setPage={setPage}
            source={cardSource}
            setSource={setCardSource}
            collections={collections}
            collectionsLoading={collectionsLoading}
            selectedCollectionId={selectedCollectionId}
            setSelectedCollectionId={setSelectedCollectionId}
          >
            <CardListSection
              cardsLoading={cardsLoading}
              allCards={allCards}
              meta={meta}
              page={page}
              setPage={setPage}
              qtyByCard={qtyByCard}
              setQtyByCard={setQtyByCard}
              roleByCard={roleByCard}
              setRoleByCard={setRoleByCard}
              addCard={addCard}
              ownedQuantityByCard={
                cardSource === "collection" ? ownedQuantityByCard : undefined
              }
              deckQuantityByCard={deckQuantityByCard}
              emptyMessage={
                cardSource === "collection"
                  ? selectedCollectionId
                    ? t("collectionEmpty")
                    : t("noCollection")
                  : undefined
              }
            />
          </CardFilterSection>

          <div className="hidden xl:block">
            <SelectedCardsSection
              cards={cardsMap}
              mainCount={mainCount}
              sideCount={sideCount}
              updateCardQty={updateCardQty}
              removeCard={removeCard}
            />
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t bg-background/95 px-3 py-2 shadow-up backdrop-blur-sm xl:sticky xl:inset-x-auto xl:z-20 xl:-mx-4 xl:px-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("back")}</span>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="xl:hidden"
              >
                <ListChecks className="h-4 w-4" />
                {t("viewDeck", { count: mainCount + sideCount })}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto p-3 sm:max-w-md">
              <SheetHeader className="pr-8 text-left">
                <SheetTitle>{t("mobileDeckTitle")}</SheetTitle>
                <SheetDescription>{t("mobileDeckHelp")}</SheetDescription>
              </SheetHeader>
              <SelectedCardsSection
                cards={cardsMap}
                mainCount={mainCount}
                sideCount={sideCount}
                updateCardQty={updateCardQty}
                removeCard={removeCard}
                sticky={false}
                className="mt-4 border-0 shadow-none"
              />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : deck ? (
              t("submitEdit")
            ) : (
              t("submitCreate")
            )}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
};
