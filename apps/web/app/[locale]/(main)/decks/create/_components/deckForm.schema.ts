import { z } from "zod";
import { PokemonCardType } from "@/types/cardPokemon";

export const FormSchema = z.object({
  name: z.string().nonempty("Nom requis"),
  formatId: z.number().min(1, "Choisissez un format"),
  cards: z.array(
    z.object({ cardId: z.uuid(), qty: z.number().min(1), role: z.string() }),
  ),
  isPublic: z.boolean().default(false),
});

export type DeckFormValues = z.input<typeof FormSchema>;

export type AddedCard = {
  id?: number;
  cardId?: string;
  qty: number;
  role: string;
  card?: PokemonCardType;
};
