import React from "react";
import { Card } from "@/components/ui/card";
import { Activity, BarChart3 } from "lucide-react";
import type { DashboardActivityDay } from "@/types/dashboard";
import { useLocale, useTranslations } from "next-intl";

interface ProfileActivityProps {
  activity?: DashboardActivityDay[];
}

export const ProfileActivity = ({ activity }: ProfileActivityProps) => {
  const t = useTranslations("ProfileActivity");
  const locale = useLocale();
  const hasActivity = activity && activity.some((day) => day.events > 0);
  const maxEvents = hasActivity
    ? Math.max(...activity!.map((d) => d.events))
    : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">{t("title")}</h2>
      </div>

      {hasActivity ? (
        <div className="space-y-3">
          {activity!.map((day) => (
            <div key={day.date} className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-28 shrink-0">
                {formatDate(day.date)}
              </span>
              <div className="flex-1 h-6 bg-muted/30 rounded-md overflow-hidden">
                {day.events > 0 && (
                  <div
                    className="h-full bg-primary/70 rounded-md transition-all"
                    style={{
                      width: `${(day.events / maxEvents) * 100}%`,
                    }}
                  />
                )}
              </div>
              <span className="text-sm font-medium w-8 text-right">
                {day.events}
              </span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center mt-2">
            {t("subtitle")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      )}
    </Card>
  );
};
