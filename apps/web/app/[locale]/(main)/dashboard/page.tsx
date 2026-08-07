"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { useDashboard } from "@/hooks/useDashboard";
import { CollectionWidget } from "./_components/CollectionWidget";
import { TournamentsWidget } from "./_components/TournamentsWidget";
import { DecksWidget } from "./_components/DecksWidget";
import { MarketplaceWidget } from "./_components/MarketplaceWidget";
import { BadgesWidget } from "./_components/BadgesWidget";
import { ActivityChart } from "./_components/ActivityChart";
import { DashboardSkeleton } from "./_components/DashboardSkeleton";
import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const DashboardPage = () => {
  const locale = useLocale();
  const t = useTranslations("Dashboard");
  const { user } = useAuth();
  const { data, isLoading, isError } = useDashboard();

  if (!user) return null;

  const memberSince = data?.user.memberSince
    ? new Date(data.user.memberSince).toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ProtectedRoute>
      <PageWrapper gradient="none" maxWidth="xl">
        {isLoading ? (
          <DashboardSkeleton />
        ) : isError || !data ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{t("title")}</h1>
              <p className="text-muted-foreground">
                {t("welcome", { name: user.firstName })}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-3xl font-bold">{t("title")}</h1>
                <p className="text-muted-foreground">
                  {t("welcome", { name: user.firstName })}
                </p>
              </div>
              {memberSince && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {t("memberSince", { date: memberSince })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CollectionWidget data={data.collection} />
              <TournamentsWidget data={data.tournaments} />
              <DecksWidget data={data.decks} />
              <MarketplaceWidget data={data.marketplace} />
              <BadgesWidget data={data.badges} />
            </div>

            <ActivityChart data={data.activity} />
          </div>
        )}
      </PageWrapper>
    </ProtectedRoute>
  );
};

export default DashboardPage;
