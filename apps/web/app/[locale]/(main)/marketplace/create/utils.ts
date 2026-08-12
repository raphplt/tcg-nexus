import z from "zod";
import { cardStates, currencyOptions } from "@/utils/variables";

const cardStateValues = cardStates.map((s) => s.value) as [string, ...string[]];

export const FormSchema = z.object({
  cardId: z.string().uuid("Carte requise."),
  price: z.number().positive("Prix invalide"),
  quantityAvailable: z.number().int().positive("Quantité invalide"),
  cardState: z.enum(cardStateValues, {
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
