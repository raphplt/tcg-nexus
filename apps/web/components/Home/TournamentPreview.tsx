"use client";
import React from "react";
import { H3 } from "../Shared/Titles";
import { tournamentService } from "@/services/tournament.service";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Link } from "lucide-react";

const TournamentPreview = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tournaments", "upcoming"],
    queryFn: () => tournamentService.getUpcomingTournaments(),
  });
  return (
    <div>
      <H3>Prochains tournois</H3>
      {isLoading && <p>Chargement des tournois...</p>}
      {error && <p>Erreur lors du chargement des tournois</p>}

      {data && (
        <div>
          {data.map((tournament) => (
            <div key={tournament.id}>{tournament.name}</div>
          ))}
        </div>
      )}
      <Button asChild>
        <Link href="/tournaments">Voir tous les tournois</Link>
      </Button>
    </div>
  );
};

export default TournamentPreview;
