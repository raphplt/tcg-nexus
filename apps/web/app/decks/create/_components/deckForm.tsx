"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@components/ui/form";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Switch } from "@components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { CardSelector } from "./cardSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { decksService } from "@/services/decks.service";

const DeckSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  formatId: z.number().min(1, "Le format est requis"),
  isPublic: z.boolean(),
  cards: z.array(z.object({
    cardId: z.string(),
    name: z.string(),
    qty: z.number().min(1),
  }))
});

type DeckFormValues = z.infer<typeof DeckSchema>;

interface FormatOption {
  id: number;
  type: string;
}

interface CardType {
  id: string;
  name: string;
}

interface DeckFormProps {
  formats: FormatOption[];
}

export const DeckForm: React.FC<DeckFormProps> = ({ formats }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const form = useForm<DeckFormValues>({
    resolver: zodResolver(DeckSchema),
    defaultValues: {
      name: "",
      formatId: 0,
      isPublic: false,
      cards: []
    }
  });
  const cards = form.watch("cards");
  const addCard = (card: CardType, qty: number) => {
    const existing = form.getValues("cards").find(c => c.cardId === card.id);
    if (existing) {
      form.setValue("cards", form.getValues("cards").map(c =>
        c.cardId === card.id ? { ...c, qty: c.qty + qty } : c
      ));
    } else {
      form.setValue("cards", [...form.getValues("cards"), { cardId: card.id, qty, name: card.name }]);
    }
  };

  const removeCard = (cardId: string) => {
    form.setValue("cards", form.getValues("cards").filter(c => c.cardId !== cardId));
  };

  const onSubmit = async (data: DeckFormValues) => {
    if (!user) return;
    setLoading(true);

    try {
      const creationData = {
        userId: user.id,
        name: data.name,
        formatId: data.formatId,
        isPublic: data.isPublic,
        cards: data.cards
      };
      console.log(creationData);
      const response = await decksService.create(creationData)
      if (response)
      {
        toast.success("Deck créé avec succès !");
        form.reset();
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création du deck");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nom */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du deck</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nom du deck" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Format */}
          <FormField
            control={form.control}
            name="formatId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format</FormLabel>
                <FormControl>
                  <Select value={field.value.toString()} onValueChange={v => field.onChange(Number(v))}>
                    <SelectTrigger>
                      {field.value ? formats.find(f => f.id === field.value)?.type : "Choisissez un format"}
                    </SelectTrigger>
                    <SelectContent>
                      {formats.map((v:any) => (
                        <SelectItem key={v.id} value={v.id.toString()}>
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

          {/* Checkbox isPublic */}
          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Public</FormLabel>
              </FormItem>
            )}
          />

          {/* Liste des cartes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <FormLabel>Cartes ajoutées</FormLabel>
              <Button type="button" onClick={() => setShowCardModal(true)}>Ajouter des cartes</Button>
            </div>

            <ul className="space-y-1">
              {cards.map((c:any) => (
                <li key={c.cardId} className="flex justify-between items-center border p-2 rounded">
                  <span>{c.name} x{c.qty}</span>
                  <Button size="sm" variant="destructive" onClick={() => removeCard(c.cardId)} type="button">
                    <Trash2 size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          {/* Modal pour ajouter les cartes */}
          {showCardModal && (
            <CardSelector
              onSelect={(card: CardType, qty: number) => {
                addCard(card, qty);
                setShowCardModal(false);
              }}
              onClose={() => setShowCardModal(false)}
            />
          )}
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Créer le deck"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
