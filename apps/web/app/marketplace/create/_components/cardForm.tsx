"use client";

import { Button } from "@components/ui/button";
import { authedFetch } from "@utils/fetch";
import React, { useState } from "react";
import {CardSelector} from "@app/marketplace/create/_components/cardSelector";
import * as z from "zod";
import { Form } from "@components/ui/form";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {toast} from "sonner";
import {Label} from "@components/ui/label";
import {Input} from "@components/ui/input";
import {FormControl, FormField, FormItem, FormLabel, FormMessage} from "@components/ui/form";
import {
    Select
} from "@/components/ui/select"
import Link from "next/link";
import {Loader2} from "lucide-react";
import {useAuth} from "@/contexts/AuthContext";
import {PokemonCardType} from "@/types/cardPokemon";
import {CardState} from "@/types/listing";
const FormSchema = z.object({
    cardId: z.string().uuid("Carte requise."),
    price: z.coerce.number().positive("Prix invalide"),
    quantityAvailable: z.coerce.number().int().positive("Quantité invalide"),
    cardState: z.nativeEnum(CardState, {
        errorMap: () => ({ message: "État requis" })
    }),
})
const cardStates = [
    { label: "Near Mint", value: CardState.NM },
    { label: "Excellent", value: CardState.EX },
    { label: "Good", value: CardState.GD },
    { label: "Lightly Played", value: CardState.LP },
    { label: "Played", value: CardState.PL },
    { label: "Poor", value: CardState.Poor },
];


const CardForm = () => {
    const [loading, setLoading] = useState(false);
    const [resetCardSelect, setResetCardSelect] = useState(0);
    const { user} = useAuth();
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            cardId: "",
            price: 0,
            quantityAvailable: 1,
            cardState: ""
        }
    });

    const onSubmit = async (data: z.infer<typeof FormSchema>) => {
        setLoading(true);
        //Création de la date d'éxpiration de base (1 mois)
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        const isoDate = expiresAt.toISOString();
        const creationData = {
            sellerId: user?.id,
            pokemonCardId: data.cardId,
            price: data.price,
            currency: "EUR",
            quantityAvailable: data.quantityAvailable,
            cardState: data.cardState,
            expiresAt: isoDate
        };
        const creationPromise =  authedFetch("POST", "/listings", { data: creationData });

        toast.promise(creationPromise, {
            loading: 'Chargement...',
            success: (data: PokemonCardType) => {
                setLoading(false);
                if (data?.id)
                {
                    setResetCardSelect(prev => prev + 1);
                    form.reset();
                    return `La vente a été créer avec succès.`;
                }
                return "Une erreur est survenue, veuillez ressayer plus tard."
            },
            error: () => {
                setLoading(false);
                return "Une erreur est survenue, veuillez ressayer plus tard."
            }
        });
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-2">
                    <Label>Carte</Label>
                    <CardSelector
                        onSelect={(card) => {
                            form.setValue("cardId", card.id)
                        }}
                        resetSignal={resetCardSelect}
                    />
                    {form.formState.errors.cardId && <p className="text-sm text-red-500">{form.formState.errors.cardId.message}</p>}
                </div>

                <div className="grid gap-2">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Prix</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Prix" {...field} />
                                </FormControl>
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
                                    <Input type="number" placeholder="Nombre" {...field} />
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
                                <div className="border rounded-md bg-background px-3 py-2 text-sm">
                                    <Select {...field} className="w-full">
                                        <option value="">Choisissez un état</option>
                                        {cardStates.map((state) => (
                                            <option key={state.value} value={state.value}>
                                                {state.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex justify-end">
                    <Button variant="secondary" className="mx-2">
                        <Link href="/marketplace">Annuler</Link>
                    </Button>
                    <Button
                        disabled={loading}
                        type="submit"
                    >
                        {
                            loading ? (
                                <Loader2 className="animate-spin"/>
                            ) : 'Continuer'
                        }
                    </Button>
                </div>
            </form>
        </Form>
    );
};

export default CardForm;
