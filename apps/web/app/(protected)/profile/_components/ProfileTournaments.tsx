import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { tournamentService } from "@/services/tournament.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { Tournament } from "@/types/tournament";

export const ProfileTournaments = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadTournaments = React.useCallback(async () => {
    if (!user?.player?.id) return;

    try {
      setLoading(true);
      const result = await tournamentService.getPlayerTournaments(
        user.player.id,
        {
          page,
          limit: 5,
          sortBy: "startDate",
          sortOrder: "DESC",
        },
      );
      setTournaments(result.data);
      setTotalPages(result.meta.totalPages);
    } catch (error) {
      console.error("Erreur chargement tournois:", error);
      toast.error("Impossible de charger vos tournois");
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    if (user?.player?.id) {
      loadTournaments();
    }
  }, [user, page, loadTournaments]);

  useEffect(() => {
    if (user?.player?.id) {
      loadTournaments();
    }
  }, [loadTournaments, user?.player?.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "FINISHED":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">Terminé</Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">En cours</Badge>
        );
      case "REGISTRATION_OPEN":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            Inscriptions ouvertes
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!user?.player?.id) {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun profil joueur</h3>
        <p className="text-muted-foreground">
          Vous devez créer un profil joueur pour participer aux tournois.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Mes tournois</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <Link href="/profile/tournament-history">Historique ELO</Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Vous n&apos;avez participé à aucun tournoi
          </p>
          <Button
            className="mt-4"
            variant="outline"
          >
            Voir les tournois à venir
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-lg">
                    {tournament.name}
                  </span>
                  {getStatusBadge(tournament.status)}
                  <Badge variant="outline">{tournament.type}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(tournament.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{tournament.location}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
              >
                Voir détails
              </Button>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
