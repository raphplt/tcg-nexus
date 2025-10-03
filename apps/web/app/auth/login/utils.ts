import z from "zod";

export const loginSchema = z.object({
  email: z.email("Format d'email invalide").min(1, "L'email est requis"),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});
