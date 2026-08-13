"use client";

import { useTranslations } from "next-intl";
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
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import type { Collection } from "@/types/collection";

const createCollectionSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("nameRequired")).max(255, t("nameMaxLength")),
    description: z
      .string()
      .max(255, t("descriptionMaxLength"))
      .optional()
      .or(z.literal("")),
    is_public: z.boolean(),
  });

type CreateCollectionFormValues = z.infer<
  ReturnType<typeof createCollectionSchema>
>;

interface CreateCollectionProps {
  onCollectionCreated?: () => void;
}

const CreateCollection: React.FC<CreateCollectionProps> = ({
  onCollectionCreated,
}) => {
  const t = useTranslations("CreateCollection");
  const schema = useMemo(() => createCollectionSchema(t), [t]);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const form = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      is_public: false,
    },
  });

  const onSubmit = async (values: CreateCollectionFormValues) => {
    if (!user?.id) {
      toast.error(t("loginRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      const collectionData: Omit<
        Collection,
        "id" | "created_at" | "updatedAt" | "items" | "user"
      > = {
        name: values.name,
        description: values.description || "",
        isPublic: values.is_public,
        userId: user.id,
      };

      await collectionService.createCollection(collectionData as Collection);

      toast.success(t("success"));

      form.reset();
      setOpen(false);

      if (onCollectionCreated) {
        onCollectionCreated();
      }
    } catch {
      toast.error(t("error"));
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
        {t("title")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nameLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("namePlaceholder")} {...field} />
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
                    <FormLabel>{t("descriptionLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("descriptionPlaceholder")}
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("descriptionHelp")}</FormDescription>
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
                      <FormLabel>{t("publicLabel")}</FormLabel>
                      <FormDescription>{t("publicHelp")}</FormDescription>
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
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("submitting")}
                    </>
                  ) : (
                    t("submit")
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
