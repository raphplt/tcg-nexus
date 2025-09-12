"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PriceChartProps {
  cardName: string;
}

// Données mockées pour les prix de la carte
const mockPriceData = [
  { week: "S1", min: 12.5, max: 18.9, avg: 15.2, listings: 45 },
  { week: "S2", min: 11.8, max: 19.5, avg: 15.8, listings: 52 },
  { week: "S3", min: 13.2, max: 20.1, avg: 16.4, listings: 38 },
  { week: "S4", min: 12.9, max: 18.7, avg: 15.6, listings: 41 },
  { week: "S5", min: 14.1, max: 21.3, avg: 17.2, listings: 35 },
  { week: "S6", min: 13.8, max: 19.8, avg: 16.8, listings: 48 },
];

const PriceChart: React.FC<PriceChartProps> = ({ cardName }) => {
  // Calculer les stats actuelles
  const currentWeek = mockPriceData[mockPriceData.length - 1];
  const previousWeek = mockPriceData[mockPriceData.length - 2];

  const priceChange = currentWeek.avg - previousWeek.avg;
  const listingsChange = currentWeek.listings - previousWeek.listings;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-green-500" />
          <span className="font-semibold">Prix & Disponibilité</span>
        </div>

        {/* Stats actuelles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {currentWeek.min}€
            </div>
            <div className="text-xs text-muted-foreground">Prix min</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {currentWeek.max}€
            </div>
            <div className="text-xs text-muted-foreground">Prix max</div>
          </div>
        </div>

        {/* Graphique des prix */}
        <div className="h-24 mb-3">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart data={mockPriceData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
                domain={[10, 25]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "11px",
                }}
                formatter={(value: number, name: string) => [
                  `${value}${name === "avg" ? "€" : ""}`,
                  name === "avg"
                    ? "Prix moyen"
                    : name === "listings"
                      ? "Ventes"
                      : name,
                ]}
                labelStyle={{ color: "#374151" }}
              />
              <Bar
                dataKey="avg"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Informations sur les ventes */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4 text-blue-500" />
            <span>{currentWeek.listings} en vente</span>
            {listingsChange > 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : listingsChange < 0 ? (
              <TrendingDown className="w-3 h-3 text-red-500" />
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Prix moyen:</span>
            <span className="font-semibold">{currentWeek.avg}€</span>
            {priceChange > 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : priceChange < 0 ? (
              <TrendingDown className="w-3 h-3 text-red-500" />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
