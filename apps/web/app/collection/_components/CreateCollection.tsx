"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { collectionService } from "@/services/collection.service";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";

const createCollectionSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(255, "Le nom ne peut pas dépasser 255 caractères"),
  description: z
    .string()
    .max(255, "La description ne peut pas dépasser 255 caractères")
    .optional()
    .or(z.literal("")),
  is_public: z.boolean(),
});

type CreateCollectionFormValues = z.infer<typeof createCollectionSchema>;

interface CreateCollectionProps {
  onCollectionCreated?: () => void;
}

const CreateCollection: React.FC<CreateCollectionProps> = ({
  onCollectionCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: "",
      description: "",
      is_public: false,
    },
  });

  const onSubmit = async (values: CreateCollectionFormValues) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté pour créer une collection");
      return;
    }

    setIsSubmitting(true);

    try {
      const collectionData = {
        name: values.name,
        description: values.description || "",
        isPublic: values.is_public,
        userId: user.id
      };

      const response = await collectionService.createCollection(
        collectionData as any,
      );

      toast.success("Collection créée avec succès !");

      form.reset();
      setOpen(false);

      if (onCollectionCreated) {
        onCollectionCreated();
      }
    } catch (error) {
      toast.error("Erreur lors de la création de la collection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="border-2 border-primary/30 hover:border-primary hover:bg-primary/5 font-semibold px-8 py-3 rounded-lg transition-all duration-300"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-5 w-5" />
        Créer une Collection
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle collection</DialogTitle>
            <DialogDescription>
              Créez une nouvelle collection pour organiser vos cartes Pokémon
              préférées.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la collection *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ex: Mes cartes préférées"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez votre collection..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Facultatif - Ajoutez une description pour votre collection
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Collection publique</FormLabel>
                      <FormDescription>
                        Les autres utilisateurs pourront voir votre collection
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création...
                    </>
                  ) : (
                    "Créer la collection"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateCollection;
