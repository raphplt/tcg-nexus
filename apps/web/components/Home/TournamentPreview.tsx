"use client";
import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { tournamentService } from "@/services/tournament.service";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const TournamentPreview = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tournaments", "upcoming"],
    queryFn: () => tournamentService.getUpcomingTournaments({ limit: 5 }),
  });

  return (
    <Card className="p-6">
      <H2 className="mb-4">Prochains tournois</H2>
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          Chargement...
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-8 text-destructive">
          Erreur lors du chargement des tournois
        </div>
      )}
      <div className="flex flex-col gap-3">
        {data && Array.isArray(data) && data.length > 0 ? (
          data.map((tournament, i) => (
            <Link
              href={`/tournaments/${tournament.id}`}
              key={tournament.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:shadow-md transition group"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white font-bold">
                {tournament.name.charAt(0).toUpperCase() || "T"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold truncate">{tournament.name}</div>
                  {tournament.isExternal && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 select-none">
                      Externe
                    </Badge>
                  )}
                </div>
              </div>

              <ArrowRight className="w-4 h-4" />
            </Link>
          ))
        ) : !isLoading && !error ? (
          <div className="text-muted-foreground text-center">
            Aucun tournoi à venir
          </div>
        ) : null}
      </div>
      <Button variant="outline" asChild size="sm" className="w-full mt-4">
        <Link href="/tournaments" className="flex items-center gap-2">
          Voir tous les tournois
          <ArrowRight className="mr-2 w-4 h-4" />
        </Link>
      </Button>
    </Card>
  );
};

export default TournamentPreview;
