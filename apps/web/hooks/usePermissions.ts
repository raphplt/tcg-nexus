import { useMemo } from "react";
import { Tournament, Match } from "@/types/tournament";
import { User, UserRole } from "@/types/auth";

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

    const isOrganizer = tournament.organizers?.some(
      (org) => org.userId === user.id && org.isActive,
    );

    const organizerRole = tournament.organizers?.find(
      (org) => org.userId === user.id && org.isActive,
    )?.role;

    const isAdmin = user.role === UserRole.ADMIN;
    const isModerator = user.role === UserRole.MODERATOR;

    const isOwner = organizerRole === "owner";
    const isTournamentAdmin = organizerRole === UserRole.ADMIN;
    const isTournamentModerator = organizerRole === UserRole.MODERATOR;
    const isJudge = organizerRole === "judge";

    const canManage = isAdmin || isModerator || isOwner || isTournamentAdmin;
    const canModerate = canManage || isTournamentModerator || isJudge;

    return {
      canManageTournament: canManage,
      canStartTournament: canManage,
      canFinishTournament: canManage,
      canCancelTournament: canManage,

      canManageRegistrations: canModerate,
      canConfirmRegistrations: canModerate,
      canViewRegistrations: canModerate,

      canReportAnyScore: canModerate,
      canResetMatches: canModerate,
      canStartMatches: canModerate,

      canViewAdmin: isOrganizer || isAdmin || isModerator,
      canViewPrivateData: canModerate,

      userRole: organizerRole || user.role,
      isOrganizer,
      isSystemAdmin: isAdmin,

      canReportMatchScore: (match: Match) => {
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

    const isPlayerA = match.playerA?.user?.id === user.id;
    const isPlayerB = match.playerB?.user?.id === user.id;
    const isPlayerInMatch = isPlayerA || isPlayerB;

    const isOrganizer = match.tournament?.organizers?.some(
      (org) => org.userId === user.id && org.isActive,
    );

    const isAdmin = user.role === UserRole.ADMIN;

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
