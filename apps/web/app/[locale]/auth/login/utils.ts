import z from "zod";

type Translate = (key: string) => string;

export const createLoginSchema = (t: Translate) =>
  z.object({
    email: z.email(t("invalidEmail")).min(1, t("emailRequired")),
    password: z.string().min(6, t("passwordMinLength")),
  });

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
