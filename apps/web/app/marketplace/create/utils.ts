import { CardState } from "@/utils/enums";
import { currencyOptions } from "@/utils/variables";
import z from "zod";

export const FormSchema = z.object({
  cardId: z.string().uuid("Carte requise."),
  price: z.number().positive("Prix invalide"),
  quantityAvailable: z.number().int().positive("Quantité invalide"),
  cardState: z.nativeEnum(CardState, {
    message: "État requis",
  }),
  description: z.string().optional(),
  currency: z.enum(
    currencyOptions.map((option) => option.value) as [string, ...string[]],
    {
      message: "Devise invalide",
    },
  ),
});
