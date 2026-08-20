"use client";

import { useQuery } from "@tanstack/react-query";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { rankingService } from "@/services/ranking.service";

/**
 * Displays the current ELO score and its progression over the latest ranked matches.
 *
 * @returns The ELO progression card.
 */
export const ProfileElo = () => {
  const t = useTranslations("ProfileElo");
  const locale = useLocale();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ranking", "elo", "me"],
    queryFn: () => rankingService.getMyElo(),
  });

  const history = [...(data?.history ?? [])].reverse();

  const chartData = history.map((entry) => ({
    date: new Date(entry.createdAt).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
    }),
    elo: entry.eloAfter,
    delta: entry.delta,
  }));

  const firstElo = chartData[0]?.elo;
  const currentElo = data?.elo ?? 0;
  const totalDelta =
    firstElo !== undefined ? currentElo - (firstElo - (history[0]?.delta ?? 0)) : 0;

  const TrendIcon =
    totalDelta > 0 ? TrendingUp : totalDelta < 0 ? TrendingDown : Minus;
  const trendColor =
    totalDelta > 0
      ? "text-green-600"
      : totalDelta < 0
        ? "text-red-600"
        : "text-muted-foreground";

  return (
    <Card className="p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold leading-none">{currentElo}</p>
          <p className={`mt-1 flex items-center justify-end gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {totalDelta > 0 ? `+${totalDelta}` : totalDelta}
            <span className="font-normal text-muted-foreground">
              {t("overPeriod", { count: history.length })}
            </span>
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("error")}
        </p>
      ) : chartData.length < 2 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="eloGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                axisLine={false}
                dataKey="date"
                fontSize={11}
                stroke="currentColor"
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                axisLine={false}
                domain={["dataMin - 20", "dataMax + 20"]}
                fontSize={11}
                stroke="currentColor"
                tickLine={false}
                width={56}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-background)",
                  fontSize: 12,
                }}
                formatter={(value, _name, item: any) => {
                  const delta = Number(item?.payload?.delta ?? 0);
                  return [
                    `${value} (${delta > 0 ? "+" : ""}${delta})`,
                    t("elo"),
                  ];
                }}
              />
              <Area
                dataKey="elo"
                fill="url(#eloGradient)"
                stroke="var(--color-primary)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
