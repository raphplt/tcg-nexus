"use client";

import React from "react";
import Image from "next/image";
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
import { UserRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { User } from "@/types/auth";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/utils/text";

const createProfileSchema = (messages: {
  firstNameRequired: string;
  lastNameRequired: string;
  invalidEmail: string;
}) =>
  z.object({
    firstName: z.string().min(1, messages.firstNameRequired),
    lastName: z.string().min(1, messages.lastNameRequired),
    email: z.string().email(messages.invalidEmail),
    avatarUrl: z.string().optional(),
  });

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>;

interface ProfileFormProps {
  user: User;
}

const AVAILABLE_AVATARS = [
  { id: "pikachu", url: "/images/avatars/pikachu.png" },
  { id: "eevee", url: "/images/avatars/eevee.png" },
  { id: "charizard", url: "/images/avatars/charizard.png" },
  { id: "blastoise", url: "/images/avatars/blastoise.png" },
  { id: "venusaur", url: "/images/avatars/venusaur.png" },
  { id: "gengar", url: "/images/avatars/gengar.png" },
  { id: "mewtwo", url: "/images/avatars/mewtwo.png" },
  { id: "snorlax", url: "/images/avatars/snorlax.png" },
  { id: "umbreon", url: "/images/avatars/umbreon.png" },
  { id: "lucario", url: "/images/avatars/lucario.png" },
  { id: "mew", url: "/images/avatars/mew.png" },
] as const;

export const ProfileForm = ({ user }: ProfileFormProps) => {
  const t = useTranslations("Settings");
  const { refreshUser } = useAuth();
  const profileSchema = createProfileSchema({
    firstNameRequired: t("validation.firstNameRequired"),
    lastNameRequired: t("validation.lastNameRequired"),
    invalidEmail: t("validation.invalidEmail"),
  });
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl || "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await userService.updateProfile(data);
      await refreshUser();
      toast.success(t("profile.updated"));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("profile.updateError");
      toast.error(message);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <UserRound className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">{t("profile.title")}</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem className="space-y-3 mb-6">
                <FormLabel>{t("profile.avatar")}</FormLabel>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-lg border bg-card/50">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-20 h-20 border-2 border-border shadow-md">
                      <AvatarImage
                        src={field.value}
                        alt={t("profile.avatarPreview")}
                      />
                      <AvatarFallback className="text-xl bg-primary/10 text-primary">
                        {getUserInitials(
                          form.watch("firstName"),
                          form.watch("lastName"),
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {field.value && (
                      <button
                        type="button"
                        onClick={() => field.onChange("")}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 shadow-sm transition-colors"
                        title={t("profile.removeAvatar")}
                        aria-label={t("profile.removeAvatar")}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-x"
                        >
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground text-center sm:text-left">
                      {t("profile.avatarHelp")}
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {AVAILABLE_AVATARS.map((avatar) => {
                        const isSelected = field.value === avatar.url;
                        const avatarName = t(`profile.avatars.${avatar.id}`);
                        return (
                          <button
                            key={avatar.id}
                            type="button"
                            onClick={() => field.onChange(avatar.url)}
                            className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95 ${
                              isSelected
                                ? "border-primary ring-2 ring-primary/45 scale-105 shadow-md"
                                : "border-transparent opacity-80 hover:opacity-100"
                            }`}
                            title={avatarName}
                            aria-label={t("profile.selectAvatar", {
                              name: avatarName,
                            })}
                          >
                            <Image
                              src={avatar.url}
                              alt={avatarName}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profile.firstName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("profile.firstNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("profile.lastName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("profile.lastNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("profile.email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("profile.emailPlaceholder")}
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
              {t("profile.save")}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};
