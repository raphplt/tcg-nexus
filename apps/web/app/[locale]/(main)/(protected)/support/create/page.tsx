"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { H1 } from "@components/Shared/Titles";
import { Button } from "@components/ui/button";
import { Alert, AlertDescription } from "@components/ui/alert";
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
import { Link, useRouter } from "@/i18n/navigation";
import { CreateSupportTicketDto } from "@/types/support-ticket";
import { supportTicketService } from "@/services/support-ticket.service";

const createFormSchema = (t: (key: string) => string) =>
  z.object({
    subject: z
      .string()
      .min(3, t("subjectMinLength"))
      .max(100, t("subjectMaxLength")),
    message: z
      .string()
      .min(5, t("messageMinLength"))
      .max(2000, t("messageMaxLength")),
  });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export default function CreateSupportTicketPage() {
  const t = useTranslations("SupportCreate");
  const schema = useMemo(() => createFormSchema(t), [t]);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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

      setSuccess(t("success"));
      setTimeout(() => {
        router.push(`/support/${ticket.id}`);
      }, 1000);
    } catch (err: any) {
      const message = err?.response?.data?.message || t("error");
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
          <H1 variant="primary">{t("title")}</H1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
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
                      <FormLabel>{t("subject")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("subjectPlaceholder")}
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
                    <FormItem>
                      <FormLabel>{t("message")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("messagePlaceholder")}
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
                  {isSubmitting ? "Envoi en cours..." : t("submit")}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
