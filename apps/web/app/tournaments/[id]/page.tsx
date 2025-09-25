"use client";
import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { tournamentService } from "@/services/tournament.service";
import { H1, H2 } from "@/components/Shared/Titles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  Info,
  BadgeCheck,
  Lock,
  Settings2,
  Bell,
  ListChecks,
  BarChart3,
} from "lucide-react";
import {
  tournamentStatusTranslation,
  tournamentTypeTranslation,
} from "@/utils/tournaments";
import { statusColor, typeColor } from "../utils";
import { formatPricing } from "@/utils/price";
import { Tournament } from "@/types/tournament";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import Link from "next/link";

function formatDate(date?: string | null) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

const LoadingView = () => (
  <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-5 w-72" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  </div>
);

const ErrorView = ({ message }: { message?: string }) => (
  <div className="max-w-6xl mx-auto py-16 px-4">
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Info className="size-5" /> Erreur de chargement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          {message || "Impossible de récupérer les détails du tournoi."}
        </p>
      </CardContent>
    </Card>
  </div>
);

export default function TournamentDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const {
    data: tournament,
    isLoading,
    error,
  } = useQuery<Tournament>({
    queryKey: ["tournament", id],
    queryFn: () =>
      tournamentService.getById(id as string) as Promise<Tournament>,
  });

  const permissions = usePermissions(user, tournament);

  const register = async (tournamentId?: number) => {
    if (!tournamentId) return;
    try {
      if (user) {
        await tournamentService.register(tournamentId, user.id, "");
        console.log("Inscription au tournoi réussie !");
      } else {
        console.error("User non authentifié.");
      }
    } catch (error) {
      console.error("Erreur lors de l'inscription au tournoi :", error);
    }
  };

  const participantCount = tournament?.players?.length || 0;
  const matchesCount = tournament?.matches?.length || 0;

  const statusBadgeVariant =
    statusColor[tournament?.status || ""] ?? "secondary";
  const typeBadgeVariant = typeColor[tournament?.type || ""] ?? "outline";

  const registrationOpen = tournament?.status === "registration_open";

  const headerSubtitle = useMemo(() => {
    const dateRange = `${formatDate(tournament?.startDate)} → ${formatDate(tournament?.endDate)}`;
    const loc = tournament?.location ? ` • ${tournament.location}` : "";
    return `${dateRange}${loc}`;
  }, [tournament?.startDate, tournament?.endDate, tournament?.location]);

  if (isLoading) return <LoadingView />;
  if (error)
    return (
      <ErrorView message={error instanceof Error ? error.message : undefined} />
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={statusBadgeVariant}
              className="capitalize"
            >
              {tournamentStatusTranslation[
                tournament!.status as keyof typeof tournamentStatusTranslation
              ] || tournament!.status}
            </Badge>
            <Badge
              variant={typeBadgeVariant}
              className="capitalize"
            >
              {tournamentTypeTranslation[
                tournament!.type as keyof typeof tournamentTypeTranslation
              ] || tournament!.type}
            </Badge>
            {tournament?.isPublic === false ? (
              <Badge
                variant="secondary"
                className="gap-1"
              >
                <Lock className="size-3" /> Privé
              </Badge>
            ) : (
              <Badge variant="outline">Public</Badge>
            )}
            {tournament?.requiresApproval && (
              <Badge
                variant="secondary"
                className="gap-1"
              >
                <BadgeCheck className="size-3" /> Validation requise
              </Badge>
            )}
          </div>
          <H1 className="text-balance">{tournament?.name}</H1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-4" />{" "}
              {formatDate(tournament?.startDate)} –{" "}
              {formatDate(tournament?.endDate)}
            </span>
            {tournament?.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" /> {tournament.location}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              disabled={!registrationOpen || !user}
              className="shadow-md"
              onClick={() => register(tournament?.id)}
            >
              {registrationOpen ? "S'inscrire" : "Inscriptions fermées"}
            </Button>

            {/* Boutons d'administration */}
            {permissions.canViewAdmin && (
              <Button
                variant="outline"
                className="shadow-md"
                asChild
              >
                <Link href={`/tournaments/${id}/admin`}>
                  <Settings2 className="size-4 mr-2" /> Administration
                </Link>
              </Button>
            )}

            {/* Bouton Bracket */}
            {tournament?.status === "in_progress" && (
              <Button
                variant="secondary"
                className="shadow-md"
                asChild
              >
                <Link href={`/tournaments/${id}/bracket`}>
                  <Trophy className="size-4 mr-2" /> Voir le bracket
                </Link>
              </Button>
            )}

            {/* Bouton Dashboard Joueur */}
            {user?.player &&
              (tournament?.status === "in_progress" ||
                tournament?.status === "finished") && (
                <Button
                  variant="outline"
                  className="shadow-md"
                  asChild
                >
                  <Link href={`/tournaments/${id}/player`}>
                    <BarChart3 className="size-4 mr-2" /> Mon dashboard
                  </Link>
                </Button>
              )}

            <Button
              variant="secondary"
              className="shadow-md"
              aria-label="Règlement"
            >
              <ListChecks className="size-4 mr-2" /> Règlement
            </Button>
          </div>
        </header>

        {/* Key stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="size-5" />}
            label="Participants"
            value={participantCount}
          />
          <StatCard
            icon={<Trophy className="size-5" />}
            label="Matches"
            value={matchesCount}
          />
          <StatCard
            icon={<Settings2 className="size-5" />}
            label="Format"
            value={
              tournamentTypeTranslation[
                tournament!.type as keyof typeof tournamentTypeTranslation
              ] || tournament!.type
            }
          />
          <StatCard
            icon={<Info className="size-5" />}
            label="Statut"
            value={
              tournamentStatusTranslation[
                tournament!.status as keyof typeof tournamentStatusTranslation
              ] || tournament!.status
            }
          />
        </section>

        {/* Overview */}
        <section
          id="aperçu"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-5" /> Aperçu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament?.description ? (
                <p className="leading-relaxed text-sm md:text-base">
                  {tournament.description}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Aucune description fournie.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <InfoRow
                  label="Période"
                  value={headerSubtitle}
                />
                <InfoRow
                  label="Lieu"
                  value={tournament?.location || "-"}
                />
                <InfoRow
                  label="Tour actuel"
                  value={`${tournament?.currentRound ?? 0}/${tournament?.totalRounds ?? 0}`}
                />
                <InfoRow
                  label="Date limite d'inscription"
                  value={formatDate(tournament?.registrationDeadline ?? null)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5" /> Récompenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament?.rewards && tournament.rewards.length > 0 ? (
                <ul className="space-y-2">
                  {tournament.rewards.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        #{r.position}
                      </span>
                      <span className="font-medium">{r.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pas de récompenses définies.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Participants */}
        <section
          id="participants"
          className="space-y-3"
        >
          <H2>Participants</H2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Joueur</TableHead>
                    <TableHead className="hidden sm:table-cell">ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournament?.players?.length ? (
                    tournament.players.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {p.name?.slice(0, 2)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-xs text-muted-foreground sm:hidden">
                                #{p.id}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          #{p.id}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center text-muted-foreground"
                      >
                        Aucun participant pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Matches */}
        <section
          id="matches"
          className="space-y-3"
        >
          <H2>Matches</H2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Phase
                    </TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Planifié
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Score
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournament?.matches?.length ? (
                    tournament.matches.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>#{m.id}</TableCell>
                        <TableCell>{m.round}</TableCell>
                        <TableCell className="hidden md:table-cell capitalize">
                          {m.phase || "-"}
                        </TableCell>
                        <TableCell className="capitalize">{m.status}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {formatDate(m.scheduledDate ?? null)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {(m.playerAScore ?? 0) +
                            " - " +
                            (m.playerBScore ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Aucun match planifié pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Classement */}
        <section
          id="classement"
          className="space-y-3"
        >
          <H2>Classement</H2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rang</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="hidden sm:table-cell">V</TableHead>
                    <TableHead className="hidden sm:table-cell">D</TableHead>
                    <TableHead className="hidden sm:table-cell">N</TableHead>
                    <TableHead className="hidden md:table-cell">
                      % Victoires
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournament?.rankings?.length ? (
                    tournament.rankings.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>#{r.rank}</TableCell>
                        <TableCell className="font-medium">
                          {r.points}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {r.wins}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {r.losses}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {r.draws}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {r.winRate ?? "0.00"}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Le classement n&apos;est pas encore disponible.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Infos & Règles */}
        <section
          id="infos"
          className="space-y-3"
        >
          <H2>Infos & Règles</H2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-5" /> Règlement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournament?.rules ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                    {tournament.rules}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun règlement fourni.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="size-5" /> Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow
                  label="Public"
                  value={tournament?.isPublic ? "Oui" : "Non"}
                />
                <InfoRow
                  label="Validation"
                  value={tournament?.requiresApproval ? "Requise" : "Non"}
                />
                <InfoRow
                  label="Retard autorisé"
                  value={tournament?.allowLateRegistration ? "Oui" : "Non"}
                />
                <InfoRow
                  label="Tarif"
                  value={formatPricing(tournament?.pricing)}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Organisateurs & Notifications */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" /> Organisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament?.organizers?.length ? (
                <ul className="space-y-3">
                  {tournament.organizers.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {o.name?.slice(0, 2)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{o.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {o.role || "Organisateur"}
                          </div>
                        </div>
                      </div>
                      {o.email && (
                        <span className="text-xs text-muted-foreground">
                          {o.email}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun organisateur renseigné.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament?.notifications?.length ? (
                <ul className="space-y-3">
                  {tournament.notifications.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <div>
                        <div className="font-medium">{n.title}</div>
                        {n.message && (
                          <div className="text-muted-foreground text-xs">
                            {n.message}
                          </div>
                        )}
                      </div>
                      {n.status && (
                        <Badge
                          variant="outline"
                          className="capitalize"
                        >
                          {n.status}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune notification.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
          <div className="bg-primary/10 text-primary rounded-md p-2 shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
