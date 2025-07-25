"use client";
import React from "react";
import { H2 } from "../Shared/Titles";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { tournamentService } from "@/services/tournament.service";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const TournamentPreview = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tournaments", "upcoming"],
    queryFn: () => tournamentService.getUpcomingTournaments(5),
  });

  return (
    <Card className="bg-card rounded-xl shadow p-6">
      <H2 className="mb-4">Tournois en cours</H2>
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
        {data && data.length > 0 ? (
          data.map((tournament, i) => (
            <div
              key={tournament.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:shadow-md transition group"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white font-bold">
                {String.fromCharCode(65 + i)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{tournament.name}</div>
              </div>
              <Link
                href={`/tournaments/${tournament.id}`}
                className="text-primary hover:underline ml-2"
              >
                &rarr;
              </Link>
            </div>
          ))
        ) : !isLoading && !error ? (
          <div className="text-muted-foreground text-center">
            Aucun tournoi à venir
          </div>
        ) : null}
      </div>
      <Button
        variant="outline"
        asChild
        size="sm"
        className="w-full mt-4"
      >
        <Link
          href="/tournaments"
          className="flex items-center gap-2"
        >
          Voir tous les tournois
          <ArrowRight className="mr-2 w-4 h-4" />
        </Link>
      </Button>
    </Card>
  );
};

export default TournamentPreview;
