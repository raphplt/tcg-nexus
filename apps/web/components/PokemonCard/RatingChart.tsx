"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RatingChartProps {
  cardName: string;
}

// Données mockées pour la cote de la carte
const mockRatingData = [
  { month: "Jan", rating: 4.2 },
  { month: "Fév", rating: 4.3 },
  { month: "Mar", rating: 4.1 },
  { month: "Avr", rating: 4.4 },
  { month: "Mai", rating: 4.5 },
  { month: "Juin", rating: 4.6 },
  { month: "Juil", rating: 4.4 },
  { month: "Aoû", rating: 4.7 },
  { month: "Sep", rating: 4.8 },
  { month: "Oct", rating: 4.6 },
  { month: "Nov", rating: 4.9 },
  { month: "Déc", rating: 4.8 },
];

const RatingChart: React.FC<RatingChartProps> = ({ cardName }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold">Cote de la carte</span>
        </div>

        <div className="h-32">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={mockRatingData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={[3.5, 5.0]}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value}/5`, "Cote"]}
                labelStyle={{ color: "#374151" }}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "#f59e0b", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {mockRatingData[mockRatingData.length - 1].rating}/5
          </div>
          <div className="text-xs text-muted-foreground">Cote actuelle</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RatingChart;
