"use client";

import { Button } from "@components/ui/button";
import { authedFetch } from "@utils/fetch";
import React, { useState } from "react";
import * as z from "zod";
import { Form } from "@components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PokemonCardType } from "@/types/cardPokemon";
import { FormSchema } from "../utils";
import { cardStates, currencyOptions } from "@/utils/variables";
import { CardState, Currency } from "@/utils/enums";
import { CardSelector } from "./CardSelector";
import { useRouter } from "next/navigation";

const CardForm = () => {
  const [loading, setLoading] = useState(false);
  const [resetCardSelect, setResetCardSelect] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      cardId: "",
      price: 0,
      quantityAvailable: 1,
      cardState: CardState.NM,
      description: "",
      currency: Currency.EUR,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const isoDate = expiresAt.toISOString();
    // Convert cardState from value (label) to key (enum key)
    let cardStateKey = Object.keys(CardState).find(
      (key) => CardState[key as keyof typeof CardState] === data.cardState,
    );
    // fallback if not found
    if (!cardStateKey) cardStateKey = data.cardState;
    const creationData = {
      sellerId: user?.id,
      pokemonCardId: data.cardId,
      price: data.price,
      currency: data.currency,
      description: data.description || "",
      quantityAvailable: data.quantityAvailable,
      cardState: cardStateKey,
      expiresAt: isoDate,
    };
    const creationPromise = authedFetch("POST", "/listings", {
      data: creationData,
    });

    toast.promise(creationPromise, {
      loading: "Chargement...",
      success: (data: PokemonCardType) => {
        setLoading(false);
        if (data?.id) {
          setResetCardSelect((prev) => prev + 1);
          form.reset();
          router.push(`/marketplace/${data.id}`);
          return `La vente a été créée avec succès.`;
        }
        return "Une erreur est survenue, veuillez ressayer plus tard.";
      },
      error: () => {
        setLoading(false);
        return "Une erreur est survenue, veuillez ressayer plus tard.";
      },
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="grid gap-2">
          <Label>Carte</Label>
          <CardSelector
            onSelect={(card) => {
              form.setValue("cardId", card.id);
            }}
            resetSignal={resetCardSelect}
          />
          {form.formState.errors.cardId && (
            <p className="text-sm text-red-500">
              {form.formState.errors.cardId.message}
            </p>
          )}
        </div>

        <div className="grid gap-2 grid-cols-2">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prix</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Prix"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Devise</FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={(value) => {
                    field.onChange(value as Currency);
                  }}
                >
                  <SelectTrigger>
                    {field.value
                      ? currencyOptions.find((c) => c.value === field.value)
                          ?.label
                      : "Choisissez une devise"}
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-2">
          <FormField
            control={form.control}
            name="quantityAvailable"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de cartes</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Nombre"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-2">
          <FormField
            control={form.control}
            name="cardState"
            render={({ field }) => (
              <FormItem>
                <FormLabel>État de la carte</FormLabel>
                <Select
                  value={field.value || ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                >
                  <SelectTrigger>
                    {field.value
                      ? cardStates.find((s) => s.value === field.value)?.label
                      : "Choisissez un état"}
                  </SelectTrigger>
                  <SelectContent>
                    {cardStates.map((state) => (
                      <SelectItem
                        key={state.value}
                        value={state.value}
                      >
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button
            variant="secondary"
            className="mx-2"
          >
            <Link href="/marketplace">Annuler</Link>
          </Button>
          <Button
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Créer la vente"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CardForm;
