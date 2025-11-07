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
import { FormSchema } from "../utils";
import { cardStates, currencyOptions } from "@/utils/variables";
import { CardState, Currency } from "@/utils/enums";
import { CardSelector } from "./cardSelector";
import { useRouter } from "next/navigation";

const CardForm = () => {
  const [loading, setLoading] = useState(false);
  const [resetCardSelect, setResetCardSelect] = useState(0);
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Vérifier que l'utilisateur est authentifié
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Vérification de l'authentification...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log("Utilisateur non authentifié:", {
      isAuthenticated,
      user,
      isLoading,
    });
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Vous devez être connecté pour créer une vente.
        </p>
        <Link href="/auth/login">
          <Button>Se connecter</Button>
        </Link>
      </div>
    );
  }

  console.log("Utilisateur authentifié:", { user: user.id, isAuthenticated });

  type FormValues = z.infer<typeof FormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      cardId: undefined as any,
      price: 0,
      quantityAvailable: 1,
      cardState: CardState.NM,
      description: "",
      currency: Currency.EUR,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user?.id) {
      toast.error("Erreur d'authentification. Veuillez vous reconnecter.");
      return;
    }

    setLoading(true);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const isoDate = expiresAt.toISOString();

    let cardStateKey = Object.keys(CardState).find(
      (key) => CardState[key as keyof typeof CardState] === data.cardState,
    );
    if (!cardStateKey) cardStateKey = data.cardState;

    const creationData = {
      pokemonCardId: data.cardId,
      price: data.price,
      currency: data.currency,
      description: data.description || "",
      quantityAvailable: data.quantityAvailable,
      cardState: cardStateKey,
      expiresAt: isoDate,
    };

    try {
      const result = await authedFetch("POST", "/listings", {
        data: creationData,
      });

      if (result?.id) {
        setResetCardSelect((prev) => prev + 1);
        form.reset();
        toast.success("La vente a été créée avec succès !");
        router.push(`/marketplace/${result.id}`);
      } else {
        toast.error("Une erreur est survenue lors de la création de la vente.");
      }
    } catch (error: any) {
      console.error("Erreur création vente:", error);

      if (error.response?.status === 401) {
        toast.error("Session expirée. Veuillez vous reconnecter.");
        router.push("/auth/login");
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Une erreur est survenue lors de la création de la vente.");
      }
    } finally {
      setLoading(false);
    }
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
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.valueAsNumber || 0)
                    }
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
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.valueAsNumber || 0)
                    }
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
