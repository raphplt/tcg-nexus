import z from "zod";

export const FormSchema = z.object({
  name: z.string().nonempty("Nom requis"),
  formatId: z.number(),
  cards: z.array(z.object({ id: z.uuid(), qty: z.number() })),
  isPublic: z.boolean().default(false)
});
