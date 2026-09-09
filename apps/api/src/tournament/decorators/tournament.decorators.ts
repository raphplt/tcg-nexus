import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Player } from "../../player/entities/player.entity";
import { Tournament as TournamentEntity } from "../entities/tournament.entity";
import { TournamentOrganizer as TournamentOrganizerEntity } from "../entities/tournament-organizer.entity";
import { TournamentRegistration as TournamentRegistrationEntity } from "../entities/tournament-registration.entity";

interface AuthenticatedRequest {
  tournamentOrganizer?: TournamentOrganizerEntity;
  tournament?: TournamentEntity;
  tournamentPlayer?: Player;
  tournamentRegistration?: TournamentRegistrationEntity;
}

/**
 * Parameter decorator to extract tournament organizer details from request context.
 * Typically used following TournamentOrganizerGuard or TournamentOwnerGuard.
 */
export const TournamentOrganizer = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext,
  ): TournamentOrganizerEntity | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournamentOrganizer;
  },
);

/**
 * Parameter decorator to extract tournament entity from request context.
 * Typically used following any tournament guard.
 */
export const Tournament = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TournamentEntity | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournament;
  },
);

/**
 * Parameter decorator to extract tournament player entity from request context.
 * Typically used following TournamentParticipantGuard.
 */
export const TournamentPlayer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Player | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournamentPlayer;
  },
);

/**
 * Parameter decorator to extract tournament registration entity from request context.
 * Typically used following TournamentParticipantGuard.
 */
export const TournamentRegistration = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext,
  ): TournamentRegistrationEntity | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournamentRegistration;
  },
);
