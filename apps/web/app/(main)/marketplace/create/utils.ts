import z from "zod";
import { cardStates, currencyOptions } from "@/utils/variables";

// Use the keys from cardStates (NM, EX, GD, LP, PL, Poor) for validation
const cardStateValues = cardStates.map((s) => s.value) as [string, ...string[]];

export const FormSchema = z.object({
  cardId: z.string().uuid("Carte requise."),
  price: z.number().positive("Prix invalide"),
  quantityAvailable: z.number().int().positive("Quantité invalide"),
  shippingCost: z
    .number()
    .min(0, "Les frais de port ne peuvent pas être négatifs")
    .max(100, "Frais de port trop élevés"),
  handlingTimeDays: z
    .number()
    .int()
    .min(1, "Au moins 1 jour")
    .max(30, "Au plus 30 jours"),
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
