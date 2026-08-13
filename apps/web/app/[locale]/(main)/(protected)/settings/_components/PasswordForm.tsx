"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Lock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { userService } from "@/services/user.service";
import { toast } from "react-hot-toast";

const createPasswordSchema = (messages: {
  minimumLength: string;
  passwordsDoNotMatch: string;
}) =>
  z
    .object({
      password: z.string().min(8, messages.minimumLength),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"],
    });

type PasswordFormData = z.infer<ReturnType<typeof createPasswordSchema>>;

export const PasswordForm = () => {
  const t = useTranslations("Settings");
  const passwordSchema = createPasswordSchema({
    minimumLength: t("validation.passwordMinimumLength"),
    passwordsDoNotMatch: t("validation.passwordsDoNotMatch"),
  });
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordFormData) => {
    try {
      await userService.updatePassword({ password: data.password });
      toast.success(t("password.updated"));
      form.reset();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("password.updateError");
      toast.error(message);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lock className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">{t("password.title")}</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password.newPassword")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("password.newPasswordPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password.confirmPassword")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t("password.confirmPasswordPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              {form.formState.isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t("password.submit")}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};
