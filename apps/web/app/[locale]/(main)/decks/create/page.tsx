"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { DeckForm } from "./_components/deckForm";
import React, { useEffect, useState } from "react";
import { authedFetch } from "@utils/fetch";
import { Skeleton } from "@components/ui/skeleton";
import { DeckFormat } from "@/types/deckFormat";

export default function CreateDeckPage() {
  const t = useTranslations("DeckCreate");
  const { isAuthenticated } = useAuth();
  const [formatList, setFormatList] = useState<DeckFormat[]>([]);
  const [formatLoading, setFormatLoading] = useState(true);

  useEffect(() => {
    const loadFormats = async () => {
      try {
        const res = await authedFetch<DeckFormat[]>("GET", "deck-format");
        if (Array.isArray(res)) {
          setFormatList(res);
        } else if (res && typeof res === "object" && "data" in (res as any)) {
          setFormatList((res as any).data as DeckFormat[]);
        }
      } catch (err) {
        console.error(t("formatsError"), err);
      } finally {
        setFormatLoading(false);
      }
    };
    loadFormats();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 to-primary/10 px-3 py-8 sm:px-4 sm:py-12">
        <Alert variant="destructive" className="mx-auto max-w-3xl">
          <AlertCircleIcon />
          <AlertTitle>{t("loginRequired")}</AlertTitle>
          <AlertDescription>
            <p>{t("loginRequiredHelp")}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (formatLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-secondary/10 via-background to-primary/10 px-3 py-4 sm:px-4 sm:py-6">
        <Skeleton className="mx-auto h-[720px] max-w-[1600px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/10 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-3">
        <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-background to-secondary/10 shadow-sm">
          <CardHeader className="space-y-0.5 p-4 sm:px-5">
            <CardTitle className="text-xl sm:text-2xl">{t("submit")}</CardTitle>
            <CardDescription className="text-sm">
              {t("subtitle")}
            </CardDescription>
          </CardHeader>
        </Card>
        <DeckForm formats={formatList} />
      </div>
    </div>
  );
}
