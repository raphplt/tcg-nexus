"use client";

import {Button} from "@components/ui/button";
import {ArrowLeft, CheckCircle, CircleAlert} from "lucide-react";
import {Alert, AlertDescription} from "@components/ui/alert";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@components/ui/form";
import {Input} from "@components/ui/input";
import React, {useState} from "react";
import * as z from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {useRouter} from "next/navigation";
import {CreateSupportTicketDto} from "@/types/support-ticket";
import {supportTicketService} from "@/services/support-ticket.service";
import {Textarea} from "@components/ui/textarea";



const formSchema = z
  .object({
    subject: z.string().min(3, "Le sujet est requis"),
    message: z.string().min(3, "Le message est requis")
  });

type FormValues = z.infer<typeof formSchema>;

export default function page() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

    try {
      const payload: CreateSupportTicketDto = {
        subject: values.subject,
        message: values.message
      };

      const tournament = await supportTicketService.create(payload);

      setSuccess("Ticket créé avec succès !");
      setTimeout(() => {
        router.push(`/support/ticket/${tournament.id}`);
      }, 1500);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "Erreur lors de la création du ticket.";
      setError(message);
    }
  };


  return (
    <div className="min-h-screen bg-linear-to-br from-primary/10 to-secondary/10 py-16 px-4">
      <div className="flex mb-6 max-w-xl">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>

      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-lg p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center">Créer un ticket</h2>

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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Sujet</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Sujet du ticket"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Message du ticket"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
            >
              Créer le ticket
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}