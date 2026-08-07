"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tournament } from "@/types/tournament";

interface TabRulesProps {
  tournament: Tournament;
}

export function TabRules({ tournament }: TabRulesProps) {
  const t = useTranslations("TournamentRules");
  return (
    <div className="space-y-6">
      {/* Règles principales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScrollText className="size-5 text-primary" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.rules ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {tournament.rules}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ScrollText className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("noRules")}</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                {t("standardRules")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations complémentaires */}
      {tournament.additionalInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="size-5 text-primary" />
              {t("additionalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {tournament.additionalInfo}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résumé des conditions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-primary" />
            {t("participationConditions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ConditionItem
              icon={
                tournament.isPublic ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <AlertCircle className="size-5 text-yellow-500" />
                )
              }
              label={t("accessibility")}
              value={
                tournament.isPublic ? "Tournoi public" : t("privateTournament")
              }
              description={
                tournament.isPublic ? t("openToAll") : t("inviteOnly")
              }
            />
            <ConditionItem
              icon={
                tournament.requiresApproval ? (
                  <AlertCircle className="size-5 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="size-5 text-green-500" />
                )
              }
              label="Validation"
              value={
                tournament.requiresApproval
                  ? "Approbation requise"
                  : "Inscription directe"
              }
              description={
                tournament.requiresApproval
                  ? t("approvalRequired")
                  : t("autoRegistration")
              }
            />
            <ConditionItem
              icon={
                tournament.allowLateRegistration ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <AlertCircle className="size-5 text-yellow-500" />
                )
              }
              label="Inscriptions tardives"
              value={
                tournament.allowLateRegistration
                  ? t("allowed")
                  : t("notAllowed")
              }
              description={
                tournament.allowLateRegistration
                  ? t("lateJoinAllowed")
                  : t("lateJoinNotAllowed")
              }
            />
            <ConditionItem
              icon={
                tournament.pricing?.refundable ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <AlertCircle className="size-5 text-yellow-500" />
                )
              }
              label="Remboursement"
              value={
                tournament.pricing?.refundable
                  ? "Remboursable"
                  : "Non remboursable"
              }
              description={
                tournament.pricing?.refundable
                  ? "Sous certaines conditions"
                  : t("noRefund")
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Conseils */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="size-5 text-primary" />
            Rappels importants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <ReminderItem>{t("conditionDeck")}</ReminderItem>
            <ReminderItem>{t("conditionArrival")}</ReminderItem>
            <ReminderItem>{t("conditionAbsence")}</ReminderItem>
            <ReminderItem>{t("conditionFairPlay")}</ReminderItem>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ConditionItem({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function ReminderItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
      <span className="text-sm text-muted-foreground">{children}</span>
    </li>
  );
}
