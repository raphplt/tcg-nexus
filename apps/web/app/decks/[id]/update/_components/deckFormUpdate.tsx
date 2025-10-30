"use client";

import React, { useEffect, useState } from "react";
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
  SelectValue,
} from "@components/ui/select";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { CardSelector } from "../../../_components/cardSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { decksService } from "@/services/decks.service";
import { FormSchema } from "./utils";
import { DeckCard } from "@/types/deck-cards";
import { Badge } from "@components/ui/badge";
import { Label } from "@components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import {
  FormatOption,
  DeckFormProps,
  cardsArrayDel,
  UpdateData,
} from "@/types/formDeck";
import CardType from "@/types/card";

type DeckFormValues = z.infer<typeof FormSchema>;

export const DeckFormUpdate: React.FC<DeckFormProps> = ({ formats }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardsMap, setCardsMap] = useState<[] | DeckCard[]>([]);
  const [deck, setDeck] = useState(null);
  const [open, setOpen] = useState(false);
  const [cardsToDelete, setCardsToDelete] = useState<[] | cardsArrayDel[]>([]);
  const [cardsToUpdate, setCardsToUpdate] = useState<[] | DeckCard[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [currentCard, setCurrentCard] = useState<null | DeckCard>(null);
  const [updatedCard, setUpdatedCard] = useState<Partial<DeckCard> | null>(
    null,
  );
  const { id } = useParams();

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      formatId: 0,
      isPublic: false,
      cards: [],
    },
  });
  const { dirtyFields } = form.formState;
  const addCard = (card: DeckCard) => {
    const currentCards = form.getValues("cards") || [];
    const existingFormCard = currentCards.find(
      (c) => c.cardId === card.cardId && c.role === card.role,
    );
    const deckCard = deck?.cards?.find((c) => c.card.id === card.cardId);
    if (deckCard && deckCard.role === card.role) {
      setCardsToUpdate((prev) => {
        const existingUpdate = prev.find(
          (c) => c.cardId === deckCard.cardId && c.role === card.role,
        );
        if (existingUpdate) {
          // si déjà dans cardsToUpdate, on additionne les quantités
          return prev.map((c) =>
            c.id === deckCard.id && c.role === card.role
              ? { ...c, qty: c.qty + card.qty }
              : c,
          );
        } else {
          // sinon on ajoute la carte
          return [
            ...prev,
            { id: deckCard.id, qty: deckCard.qty + card.qty, role: card.role },
          ];
        }
      });
      setCardsMap((prev) => {
        const existing = prev.find(
          (c: any) => c.id === deckCard.id && c.role === card.role,
        );
        if (existing) {
          return prev.map((c) =>
            c.id === deckCard.id && c.role === card.role
              ? { ...c, qty: c.qty + card.qty }
              : c,
          );
        } else {
          return [
            ...prev,
            {
              cardId: card.cardId,
              id: deckCard.id,
              name: card.name,
              qty: deckCard.qty + card.qty,
              role: card.role,
            },
          ];
        }
      });
    } else if (existingFormCard) {
      form.setValue(
        "cards",
        currentCards.map((c) =>
          c.cardId === card.cardId
            ? { ...c, qty: c.qty + card.qty, role: card.role }
            : c,
        ),
      );
      setCardsMap((prev) => {
        const existing = prev.find(
          (c) => c.cardId === card.cardId && c.role === card.role,
        );
        if (existing) {
          return prev.map((c) =>
            c.cardId === card.cardId && c.role === card.role
              ? {
                  ...c,
                  qty: c.qty + card?.qty,
                  role: card.role,
                }
              : c,
          );
        } else {
          return [
            ...prev,
            {
              cardId: card.cardId,
              name: card.name,
              qty: card.qty,
              role: card.role,
            },
          ];
        }
      });
    } else {
      form.setValue("cards", [
        ...currentCards,
        { cardId: card.cardId, qty: card.qty, role: card.role },
      ]);
      setCardsMap((prev) => [
        ...prev,
        {
          cardId: card.cardId,
          name: card.name,
          qty: card.qty,
          role: card.role,
        },
      ]);
    }
  };

  const updateCard = (
    card: Partial<DeckCard>,
    oldCard: Pick<DeckCard, "qty" | "role">,
  ) => {
    const currentCards = form.getValues("cards") || [];
    const existingFormCard = currentCards.find(
      (c) => c.cardId === card.cardId && c.role === oldCard.role,
    );
    if (card?.id) {
      const deckCard = deck?.cards?.find((c) => c.id === card.id);
      if (deckCard) {
        setCardsToUpdate((prev) => {
          const existingUpdate = prev.find((c) => c.id === card.id);
          if (existingUpdate) {
            // si déjà dans cardsToUpdate, on additionne les quantités
            return prev.map((c) =>
              c.id === deckCard.id && c.role === oldCard.role
                ? {
                    ...c,
                    qty: card?.qty ?? c.qty,
                    ...(card?.role ? { role: card.role } : {}),
                  }
                : c,
            );
          } else {
            return [
              ...prev,
              {
                id: deckCard.id,
                ...(card?.qty ? { qty: card.qty } : {}),
                ...(card?.role ? { role: card.role } : {}),
              },
            ];
          }
        });
        setCardsMap((prev) => {
          const existing = prev.find((c: any) => c.id === deckCard.id);
          if (existing) {
            return prev.map((c) =>
              c.id === deckCard.id
                ? {
                    ...c,
                    qty: card?.qty ?? c.qty,
                    ...(card?.role ? { role: card.role } : {}),
                  }
                : c,
            );
          } else {
            return [
              ...prev,
              {
                cardId: card.cardId,
                id: deckCard.id,
                name: card.name,
                qty: card.qty,
                role: card.role,
              },
            ];
          }
        });
      }
    } else if (existingFormCard) {
      form.setValue(
        "cards",
        currentCards.map((c) =>
          c.cardId === card.cardId && c.role === oldCard.role
            ? {
                ...c,
                ...(card?.qty ? { qty: card.qty } : {}),
                ...(card?.role ? { role: card.role } : {}),
              }
            : c,
        ),
      );
      setCardsMap((prev) => {
        const existing = prev.find(
          (c) => c.cardId === card.cardId && c.role === oldCard.role,
        );
        if (!existing) return prev;
        return prev.map((c) =>
          c.cardId === card.cardId && c.role === oldCard.role
            ? {
                ...c,
                ...(card?.qty ? { qty: card.qty } : {}),
                ...(card?.role ? { role: card.role } : {}),
              }
            : c,
        );
      });
    }
  };

  const removeCard = (card: Pick<DeckCard, "id" | "cardId" | "role">) => {
    if (card.id && deck?.cards?.some((c) => c.id === card.id)) {
      setCardsToDelete((prev) => [...prev, { id: card.id }]);
      setCardsMap((prev) => prev.filter((c) => c.id !== card.id));
    } else {
      const currentCards = form.getValues("cards") || [];

      const newFormCards = currentCards.filter(
        (c) =>
          !(
            String(c.cardId) === String(card.cardId) &&
            String(c.role).trim() === String(card.role).trim()
          ),
      );
      form.setValue("cards", newFormCards);
      setCardsMap((prev) =>
        prev.filter(
          (c) =>
            !(
              String(c.cardId) === String(card.cardId) &&
              String(c.role).trim() === String(card.role).trim()
            ),
        ),
      );
    }
  };

  const roleReplacer = (role) => {
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
  const onSubmit = async (data: DeckFormValues) => {
    if (!user || !id || typeof id !== "string") return;
    setLoading(true);
    try {
      const updateData: UpdateData = {
        ...(dirtyFields.name && { deckName: data.name }),
        ...(dirtyFields.formatId && { formatId: data.formatId }),
        ...(dirtyFields.isPublic && { isPublic: data.isPublic }),
        cardsToAdd: data.cards,
        cardsToRemove: cardsToDelete,
        cardsToUpdate,
      };

      const response = await decksService.update(parseInt(id), updateData);

      if (response) {
        toast.success("Deck modifié avec succès !");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la modification du deck");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadDeck = async () => {
      setDeckLoading(true);
      try {
        const response = await decksService.getDeckById(id as string);
        if (response) {
          setDeck(response);
          form.reset({
            name: response.name,
            formatId: response.format.id,
            isPublic: response.isPublic,
            cards: [],
          });
          setCardsMap(
            response.cards.map((c: any) => ({
              cardId: c.card.id,
              id: c.id,
              name: c.card.name,
              qty: c.qty,
              role: c.role,
            })),
          );
        }
      } finally {
        setDeckLoading(false);
      }
    };
    loadDeck();
  }, [id, form]);

  if (deckLoading) {
    return <Loader2 />;
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Nom */}
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
                    value={field.value ? field.value.toString() : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez un format" />
                    </SelectTrigger>
                    <SelectContent>
                      {formats.map((f: FormatOption) => (
                        <SelectItem
                          key={f.id}
                          value={f.id.toString()}
                        >
                          {f.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Checkbox isPublic */}
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

          {/* Liste des cartes */}
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

            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {cardsMap &&
                cardsMap.map((c: any) => (
                  <li
                    key={c.cardId + c.role}
                    className="flex justify-between items-center border p-2 rounded"
                  >
                    <div>
                      <span className="mr-2">
                        {c.name} x{c.qty}
                      </span>
                      <Badge variant="outline">{roleReplacer(c.role)}</Badge>
                    </div>
                    <div>
                      <Button
                        className="mr-2"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (c) {
                            setCurrentCard(c);
                          }
                          setUpdatedCard({ id: c.id });
                          setOpen(true);
                        }}
                        type="button"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          removeCard({
                            id: c.id,
                            role: c.role,
                            cardId: c.cardId,
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
          {/* Modal pour ajouter les cartes */}
          {showCardModal && (
            <CardSelector
              onSelect={(card: CardType, qty: number, role: string) => {
                addCard({ cardId: card.id, name: card.name, qty, role });
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
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : "Modifier"}
            </Button>
          </div>
        </form>
      </Form>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Modification de la carte "{currentCard?.name ?? ""}"
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="cardQty">Quantité</Label>
              <Input
                id="cardQty"
                type="number"
                name="name"
                defaultValue={currentCard?.qty}
                onChange={(v) => {
                  let value = v.currentTarget.value;
                  if (value) {
                    setUpdatedCard((c) =>
                      c ? { ...c, qty: parseInt(value) } : null,
                    );
                  }
                }}
              />
            </div>
            <div className="grid gap-3">
              <Label>Rôle</Label>
              <Select
                defaultValue={currentCard?.role ?? ""}
                onValueChange={(v) => {
                  if (v) {
                    setUpdatedCard((c) =>
                      c ? ({ ...c, role: v } as DeckCard) : null,
                    );
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Principal</SelectItem>
                  <SelectItem value="side">Secondaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (
                  updatedCard &&
                  (updatedCard.qty !== currentCard?.qty ||
                    updatedCard.role !== currentCard?.role)
                ) {
                  updateCard(
                    { ...updatedCard, cardId: currentCard?.cardId },
                    { qty: currentCard!.qty, role: currentCard!.role },
                  );
                }

                setOpen(false);
              }}
            >
              continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
