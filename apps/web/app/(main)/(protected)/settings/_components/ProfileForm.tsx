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
import { User } from "@/types/auth";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/utils/text";

const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  avatarUrl: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: User;
}

const AVAILABLE_AVATARS = [
  { id: "pikachu", name: "Pikachu", url: "/images/avatars/pikachu.png" },
  { id: "eevee", name: "Évoli", url: "/images/avatars/eevee.png" },
  { id: "charizard", name: "Dracaufeu", url: "/images/avatars/charizard.png" },
  { id: "blastoise", name: "Tortank", url: "/images/avatars/blastoise.png" },
  { id: "venusaur", name: "Florizarre", url: "/images/avatars/venusaur.png" },
  { id: "gengar", name: "Ectoplasma", url: "/images/avatars/gengar.png" },
  { id: "mewtwo", name: "Mewtwo", url: "/images/avatars/mewtwo.png" },
  { id: "snorlax", name: "Ronflex", url: "/images/avatars/snorlax.png" },
  { id: "umbreon", name: "Noctali", url: "/images/avatars/umbreon.png" },
  { id: "lucario", name: "Lucario", url: "/images/avatars/lucario.png" },
  { id: "mew", name: "Mew", url: "/images/avatars/mew.png" },
];

export const ProfileForm = ({ user }: ProfileFormProps) => {
  const { refreshUser } = useAuth();
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
      toast.success("Profil mis à jour avec succès");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour";
      toast.error(message);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <UserRound className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Informations personnelles</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem className="space-y-3 mb-6">
                <FormLabel>Avatar de profil</FormLabel>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-lg border bg-card/50">
                  {/* Preview */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-20 h-20 border-2 border-border shadow-md">
                      <AvatarImage src={field.value} alt="Preview" />
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
                        title="Supprimer l'avatar"
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
                  {/* Selector Grid */}
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground text-center sm:text-left">
                      Choisissez un Pokémon emblématique comme avatar pour votre
                      compte :
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {AVAILABLE_AVATARS.map((avatar) => {
                        const isSelected = field.value === avatar.url;
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
                            title={avatar.name}
                          >
                            <Image
                              src={avatar.url}
                              alt={avatar.name}
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
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre prénom" {...field} />
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
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre nom" {...field} />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="votre@email.com"
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
              Enregistrer
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};
