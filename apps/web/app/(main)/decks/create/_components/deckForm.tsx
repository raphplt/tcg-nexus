"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@components/ui/form";
import { Button } from "@components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { decksService } from "@/services/decks.service";
import { DeckFormProps } from "@/types/formDeck";
import { PokemonCardType } from "@/types/cardPokemon";
import { useDebounce } from "@/hooks/useDebounce";
import { FilterState, useMarketplaceCards } from "@/hooks/useMarketplace";
import { DeckCard } from "@/types/deck-cards";
import { DeckFormValues, FormSchema, AddedCard } from "./deckForm.schema";
import { DeckInfoSection } from "./form-parts/DeckInfoSection";
import { DeckStatsSection } from "./form-parts/DeckStatsSection";
import { CardFilterSection } from "./form-parts/CardFilterSection";
import { CardListSection } from "./form-parts/CardListSection";
import { SelectedCardsSection } from "./form-parts/SelectedCardsSection";

export const DeckForm: React.FC<DeckFormProps> = ({ formats, deck }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cardsMap, setCardsMap] = useState<AddedCard[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
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
    data,
    sets,
    series,
    isLoading: cardsLoading,
  } = useMarketplaceCards(filtersWithSearch, page, 10);

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

  const allCards = data?.data || [];
  const meta = data?.meta;

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
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

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [filtersWithSearch]);

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

        // Pour mettre à jour les cartes qui ont été modifiées
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
          toast.success("Deck modifié avec succès !");
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
          toast.success("Deck créé avec succès !");
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
      let toastMsg = deck
        ? "Erreur lors de la modification du deck"
        : "Erreur lors de la création du deck";
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
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid xl:grid-cols-3 gap-6">
            <DeckInfoSection
              form={form}
              formats={formats}
              isEditMode={!!deck}
            />

            <DeckStatsSection
              cards={cardsMap}
              mainCount={mainCount}
              sideCount={sideCount}
            />
          </div>

          <div className="grid xl:grid-cols-3 gap-6">
            <CardFilterSection
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              filters={filters}
              setFilters={setFilters}
              activeFiltersCount={activeFiltersCount}
              series={series as any[]}
              sets={sets as any[]}
              setPage={setPage}
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
              />
            </CardFilterSection>

            <SelectedCardsSection
              cards={cardsMap}
              mainCount={mainCount}
              sideCount={sideCount}
              updateCardQty={updateCardQty}
              removeCard={removeCard}
            />
          </div>

          <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm py-4 border-t mt-6 flex justify-end gap-3 px-4 -mx-4 shadow-up">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Retour
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : deck ? (
                "Modifier le deck"
              ) : (
                "Créer le deck"
              )}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};