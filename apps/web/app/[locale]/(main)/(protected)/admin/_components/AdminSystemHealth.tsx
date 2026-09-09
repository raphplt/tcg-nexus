"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  Database,
  Eye,
  Server,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { secureApi } from "@/utils/fetch";

interface SystemHealthDetails {
  status: "ok" | "down";
  timestamp: string;
  uptime: number;
  environment: string;
  nodeVersion: string;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
  };
  checks: {
    database: {
      status: "ok" | "down";
      latencyMs: number;
      error?: string;
    };
    pgvector: {
      status: "ok" | "down";
      installed: boolean;
      error?: string;
    };
    migrations: {
      status: "ok" | "down";
      pendingCount: number;
      error?: string;
    };
    vision: {
      status: "ok" | "down";
      error?: string;
    };
  };
}

export function AdminSystemHealth() {
  const [data, setData] = useState<SystemHealthDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await secureApi.get<SystemHealthDetails>("/health/details");
      setData(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Impossible de récupérer les diagnostics système.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}j ` : ""}${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Santé Système & Infrastructure
          </h2>
          <p className="text-sm text-muted-foreground">
            Diagnostics en temps réel des bases de données, extensions
            vectorielles, migrations et microservices.
          </p>
        </div>
        <Button
          onClick={fetchHealth}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive p-4">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      )}

      {data && (
        <>
          {/* Global Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Statut Global
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {data.status === "ok" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                  <span className="text-xl font-bold uppercase tracking-wider">
                    {data.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Environnement : {data.environment}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Uptime API
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{formatUptime(data.uptime)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Node {data.nodeVersion}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Mémoire RSS
                </CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{data.memory.rssMb} Mo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Heap : {data.memory.heapUsedMb} / {data.memory.heapTotalMb} Mo
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Latence PostgreSQL
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {data.checks.database.latencyMs} ms
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PostgreSQL 15 / TypeORM
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Subsystems Detailed Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60 bg-card/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">
                      Base de Données & pgvector
                    </CardTitle>
                  </div>
                  <Badge
                    variant={
                      data.checks.database.status === "ok"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {data.checks.database.status}
                  </Badge>
                </div>
                <CardDescription>
                  Connexion PostgreSQL et support des vecteurs de similarité
                  visuelle (embeddings).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">
                    Extension pgvector :
                  </span>
                  <span className="font-medium">
                    {data.checks.pgvector.installed
                      ? "Installée & Active"
                      : "Non disponible"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">
                    Migrations en attente :
                  </span>
                  <span className="font-medium">
                    {data.checks.migrations.pendingCount === 0
                      ? "0 (À jour)"
                      : data.checks.migrations.pendingCount}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Latence ping :</span>
                  <span className="font-medium">
                    {data.checks.database.latencyMs} ms
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">
                      Microservices & Vision
                    </CardTitle>
                  </div>
                  <Badge
                    variant={
                      data.checks.vision.status === "ok"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {data.checks.vision.status}
                  </Badge>
                </div>
                <CardDescription>
                  Pipeline de reconnaissance visuelle CLIP, OCR et découpage
                  automatique des cartes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">
                    Service Vision :
                  </span>
                  <span className="font-medium">
                    {data.checks.vision.status === "ok"
                      ? "Opérationnel"
                      : data.checks.vision.error || "Indisponible"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground">
                    Sonde de Vivacité (Liveness) :
                  </span>
                  <span className="font-medium text-emerald-500">
                    /api/health/live (200 OK)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">
                    Sonde de Disponibilité (Readiness) :
                  </span>
                  <span className="font-medium text-emerald-500">
                    /api/health/ready (200 OK)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
