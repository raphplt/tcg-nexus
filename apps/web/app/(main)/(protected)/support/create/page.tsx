"use client";

import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@components/Shared/Titles";
import { Button } from "@components/ui/button";
import {
  Alert,
  AlertDescription,
} from "@components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
import { Card, CardContent } from "@components/ui/card";
import { ArrowLeft, CheckCircle, CircleAlert, Send } from "lucide-react";
import React, { useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CreateSupportTicketDto } from "@/types/support-ticket";
import { supportTicketService } from "@/services/support-ticket.service";
import Link from "next/link";

const formSchema = z.object({
  subject: z
    .string()
    .min(3, "Le sujet doit contenir au moins 3 caractères")
    .max(100, "Le sujet ne peut pas dépasser 100 caractères"),
  message: z
    .string()
    .min(5, "Le message doit contenir au moins 5 caractères")
    .max(2000, "Le message ne peut pas dépasser 2000 caractères"),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateSupportTicketPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const payload: CreateSupportTicketDto = {
        subject: values.subject,
        message: values.message,
      };

      const ticket = await supportTicketService.create(payload);

      setSuccess("Ticket créé avec succès !");
      setTimeout(() => {
        router.push(`/support/${ticket.id}`);
      }, 1000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Erreur lors de la création du ticket.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper gradient="secondary" maxWidth="md">
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/support">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Link>
        </Button>

        <div className="text-center space-y-2">
          <H1 variant="primary">Créer un ticket</H1>
          <p className="text-muted-foreground">
            Décrivez votre problème et notre équipe vous répondra rapidement.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            {error && (
              <Alert variant="destructive">
                <CircleAlert className="h-5 w-5" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sujet</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Problème de paiement" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez votre problème en détail..."
                          className="min-h-[150px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Envoi en cours..." : "Envoyer le ticket"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
