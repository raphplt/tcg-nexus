"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeckAnalysis } from "@/types/deck-analysis";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DeckDistributionsProps {
  analysis: DeckAnalysis;
}

export function DeckDistributions({ analysis }: DeckDistributionsProps) {
  const curveData = analysis.attackCostDistribution.map((entry) => ({
    cost: `${entry.cost}`,
    count: entry.count,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Répartition des types</CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.typeDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun type détecté.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analysis.typeDistribution.map((entry) => (
                <Badge
                  key={entry.label}
                  variant="outline"
                  className="gap-2 py-1.5"
                >
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.count} · {entry.percentage}%
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Catégories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {analysis.categoryDistribution.map((entry) => (
              <Badge
                key={entry.label}
                variant="outline"
                className="gap-2 py-1.5"
              >
                <span className="font-medium">{entry.label}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.count} · {entry.percentage}%
                </span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 shadow-sm md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            Courbe des coûts d'attaque
          </CardTitle>
        </CardHeader>
        <CardContent>
          {curveData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Pas d'attaques recensées.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={curveData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="cost"
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                    label={{
                      value: "Coût en énergies",
                      position: "insideBottom",
                      offset: -4,
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [value ?? 0, "Attaques"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
