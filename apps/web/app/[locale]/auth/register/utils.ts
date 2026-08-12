import { z } from "zod";

type Translate = (key: string) => string;

export const createRegisterSchema = (t: Translate) =>
  z
    .object({
      firstName: z
        .string()
        .min(1, t("firstNameRequired"))
        .min(2, t("firstNameMinLength")),
      lastName: z
        .string()
        .min(1, t("lastNameRequired"))
        .min(2, t("lastNameMinLength")),
      email: z.string().min(1, t("emailRequired")).email(t("invalidEmail")),
      password: z
        .string()
        .min(6, t("passwordMinLength"))
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t("passwordComplexity")),
      confirmPassword: z.string().min(1, t("confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });

export type RegisterFormValues = z.infer<
  ReturnType<typeof createRegisterSchema>
>;
