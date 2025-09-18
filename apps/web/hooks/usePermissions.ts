import { useMemo } from "react";
import { Tournament, Match } from "@/types/tournament";
import { User } from "@/types/auth";

export function usePermissions(user: User | null, tournament?: Tournament) {
  return useMemo(() => {
    if (!user || !tournament) {
      return {
        canManageTournament: false,
        canStartTournament: false,
        canFinishTournament: false,
        canCancelTournament: false,
        canManageRegistrations: false,
        canReportAnyScore: false,
        canResetMatches: false,
        canViewAdmin: false,
      };
    }

    // Vérifier si l'utilisateur est organisateur du tournoi
    const isOrganizer = tournament.organizers?.some(
      (org) => org.userId === user.id && org.isActive,
    );

    const organizerRole = tournament.organizers?.find(
      (org) => org.userId === user.id && org.isActive,
    )?.role;

    // Permissions système
    const isAdmin = user.role === "ADMIN";
    const isModerator = user.role === "MODERATOR";

    // Permissions organisateur
    const isOwner = organizerRole === "owner";
    const isTournamentAdmin = organizerRole === "admin";
    const isTournamentModerator = organizerRole === "moderator";
    const isJudge = organizerRole === "judge";

    const canManage = isAdmin || isModerator || isOwner || isTournamentAdmin;
    const canModerate = canManage || isTournamentModerator || isJudge;

    return {
      // Gestion générale du tournoi
      canManageTournament: canManage,
      canStartTournament: canManage,
      canFinishTournament: canManage,
      canCancelTournament: canManage,

      // Gestion des inscriptions
      canManageRegistrations: canModerate,
      canConfirmRegistrations: canModerate,
      canViewRegistrations: canModerate,

      // Gestion des matches
      canReportAnyScore: canModerate,
      canResetMatches: canModerate,
      canStartMatches: canModerate,

      // Vues
      canViewAdmin: isOrganizer || isAdmin || isModerator,
      canViewPrivateData: canModerate,

      // Rôles
      userRole: organizerRole || user.role?.toLowerCase(),
      isOrganizer,
      isSystemAdmin: isAdmin,

      // Helpers
      canReportMatchScore: (match: Match) => {
        // Un joueur peut reporter le score de son propre match
        const isPlayerInMatch =
          match.playerA?.user?.id === user.id ||
          match.playerB?.user?.id === user.id;
        return canModerate || isPlayerInMatch;
      },
    };
  }, [user, tournament]);
}

export function useMatchPermissions(user: User | null, match?: Match) {
  return useMemo(() => {
    if (!user || !match) {
      return {
        canReportScore: false,
        canStartMatch: false,
        canResetMatch: false,
        canViewMatch: true,
      };
    }

    // Vérifier si l'utilisateur est un des joueurs du match
    const isPlayerA = match.playerA?.user?.id === user.id;
    const isPlayerB = match.playerB?.user?.id === user.id;
    const isPlayerInMatch = isPlayerA || isPlayerB;

    // Vérifier si l'utilisateur est organisateur du tournoi
    const isOrganizer = match.tournament?.organizers?.some(
      (org) => org.userId === user.id && org.isActive,
    );

    const isAdmin = user.role === "ADMIN";

    return {
      canReportScore: isPlayerInMatch || isOrganizer || isAdmin,
      canStartMatch: isOrganizer || isAdmin,
      canResetMatch: isOrganizer || isAdmin,
      canViewMatch: true,
      isPlayerInMatch,
      isPlayerA,
      isPlayerB,
    };
  }, [user, match]);
}
