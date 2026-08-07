import z from "zod";

export const FormSchema = z.object({
  name: z.string().nonempty("Nom requis"),
  formatId: z.number().min(1, "Choisissez un format"),
  cards: z.array(
    z.object({ cardId: z.uuid(), qty: z.number().min(1), role: z.string() }),
  ),
  isPublic: z.boolean().default(false),
});
