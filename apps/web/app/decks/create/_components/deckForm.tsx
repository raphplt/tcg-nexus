"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Switch } from "@components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { CardSelector } from "../../_components/cardSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { decksService } from "@/services/decks.service";
import { FormSchema } from "./utils";
import { DeckFormProps } from "@/types/formDeck";
import CardType from "@/types/card";
import {Badge} from "@components/ui/badge";
import { PokemonCardType } from "@/types/cardPokemon";

type DeckFormValues = z.input<typeof FormSchema>;

type AddedCard = {
  id?: number;
  cardId?: string;
  name?: string;
  qty: number;
  role: string;
  card?: CardType;
};

export const DeckForm: React.FC<DeckFormProps> = ({ formats }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardsMap, setCardsMap] = useState<AddedCard[]>([]);
  const form = useForm<DeckFormValues>({
    resolver: zodResolver(FormSchema),
    errors: {},
    defaultValues: {
      name: "",
      formatId: 0,
      isPublic: false,
      cards: [],
    },
  });
  const roleReplacer = (role: string) => {
    let returnVal = "";
    switch (role) {
      case "main":
        returnVal = "Principal";
        break;
      case "side":
        returnVal = "Secondaire";
        break;
    }
    return returnVal;
  };
  const addCard = (card: PokemonCardType, qty: number, role: string) => {
    const currentCards = form.getValues("cards") || [];
    const cardId = card.id;
    const existing = form
      .getValues("cards")
      .find((c) => c.cardId === cardId && c.role === role);
    if (existing) {
      form.setValue(
        "cards",
        form
          .getValues("cards")
          .map((c) =>
            c.cardId === cardId ? { ...c, qty: c.qty + qty, role: role } : c,
          ),
      );
      setCardsMap((prev) => {
        const existing = prev.find(
          (c) => c.cardId === cardId && c.role === role,
        );
        if (existing) {
          return prev.map((c) =>
            c.cardId === cardId && c.role === role
              ? { ...c, qty: c.qty + qty, role: role }
              : c,
          );
        } else {
          return [
            ...prev,
            {
              cardId: cardId,
              name: card.name,
              qty: qty,
              role: role,
            },
          ];
        }
      });
    } else {
      form.setValue("cards", [...currentCards, { cardId: cardId, qty, role }]);
      setCardsMap((prev) => [
        ...prev,
        {
          cardId: cardId,
          name: card.name,
          qty: qty,
          role: role,
        },
      ]);
    }
  };

  const removeCard = (cardId?: string) => {
    form.setValue(
      "cards",
      form.getValues("cards").filter((c) => c.cardId !== cardId),
    );
    setCardsMap((prev) => prev.filter((c) => c.cardId !== cardId));
  };

  const onSubmit = async (data: DeckFormValues) => {
    if (!user) return;
    setLoading(true);

    try {
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
      if (cardsPayload.length !== sourceCards.length) {
        console.warn(
          "Some cards had missing cardId and were skipped in payload",
        );
      }
      if ((!data.cards || data.cards.length === 0) && cardsMap.length > 0) {
        console.warn(
          "Form submitted with empty data.cards — falling back to local cardsMap",
        );
      }
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
      }
    } catch (err: any) {
      console.error("Deck creation error:", err);
      if (err?.response?.data) {
        console.error("Backend response:", err.response.data);
      }

      const backendMessage = err?.response?.data?.message;
      let toastMsg = "Erreur lors de la création du deck";
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
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du deck</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Nom du deck"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="formatId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format</FormLabel>
                <FormControl>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      {field.value
                        ? formats.find((f) => f.id === field.value)?.type
                        : "Choisissez un format"}
                    </SelectTrigger>
                    <SelectContent>
                      {formats.map((v: any) => (
                        <SelectItem
                          key={v.id}
                          value={v.id.toString()}
                        >
                          {v.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Public</FormLabel>
              </FormItem>
            )}
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <FormLabel>Cartes ajoutées</FormLabel>
              <Button
                type="button"
                onClick={() => setShowCardModal(true)}
              >
                Ajouter des cartes
              </Button>
            </div>
            <ul className="space-y-1">
              {cardsMap.map((c) => (
                <li
                  key={`${c.cardId}-${c.role}`}
                  className="flex justify-between items-center border p-2 rounded"
                >
                  <div>
                    <span>
                      {c.name} x{c.qty}
                    </span>
                    <Badge variant="outline">{roleReplacer(c.role)}</Badge>
                  </div>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeCard(c.cardId)}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          {showCardModal && (
            <CardSelector
              onSelect={(card: PokemonCardType, qty: number, role: string) => {
                addCard(card, qty, role);
                setShowCardModal(false);
              }}
              onClose={() => setShowCardModal(false)}
            />
          )}
          <div className="flex justify-end mt-4">
            <Button
              type="button"
              variant="secondary"
              className="mr-2"
              onClick={() => router.back()}
            >
              Retour
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Créer le deck"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
