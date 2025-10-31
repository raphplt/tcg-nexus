"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/utils/price";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceChartProps {
  data: Array<{
    price: number;
    currency: string;
    recordedAt: Date | string;
  }>;
  currency?: string;
  className?: string;
  showTrend?: boolean;
}

export function PriceChart({
  data,
  currency = "EUR",
  className,
  showTrend = true,
}: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Historique des prix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .map((item) => ({
      date: new Date(item.recordedAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      price: parseFloat(item.price.toString()),
      fullDate: new Date(item.recordedAt),
    }))
    .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());

  const firstPrice = chartData[0]?.price;
  const lastPrice = chartData[chartData.length - 1]?.price;
  const trend =
    firstPrice && lastPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold mb-1">
            {payload[0].payload.fullDate.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-primary font-medium">
            {formatPrice(payload[0].value, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Historique des prix</CardTitle>
          {showTrend && (
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    +{trend.toFixed(1)}%
                  </span>
                </>
              ) : trend < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    {trend.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    0%
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={300}
        >
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "currentColor" }}
              tickFormatter={(value) => formatPrice(value, currency)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="linear"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

