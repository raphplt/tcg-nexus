import { CardState } from "@/utils/enums";
import { currencyOptions } from "@/utils/variables";
import z from "zod";

export const FormSchema = z.object({
  cardId: z.string().uuid("Carte requise."),
  price: z.coerce.number().positive("Prix invalide"),
  quantityAvailable: z.coerce.number().int().positive("Quantité invalide"),
  cardState: z.nativeEnum(CardState, {
    errorMap: () => ({ message: "État requis" }),
  }),
  description: z.string().optional(),
  currency: z.enum(
    currencyOptions.map((option) => option.value) as [string, ...string[]],
    {
      errorMap: () => ({ message: "Devise invalide" }),
    },
  ),
});
