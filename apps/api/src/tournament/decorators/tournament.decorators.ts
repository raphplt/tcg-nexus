import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TournamentOrganizer as TournamentOrganizerEntity } from '../entities/tournament-organizer.entity';
import { Tournament as TournamentEntity } from '../entities/tournament.entity';
import { Player } from '../../player/entities/player.entity';
import { TournamentRegistration as TournamentRegistrationEntity } from '../entities/tournament-registration.entity';

interface AuthenticatedRequest {
  tournamentOrganizer?: TournamentOrganizerEntity;
  tournament?: TournamentEntity;
  tournamentPlayer?: Player;
  tournamentRegistration?: TournamentRegistrationEntity;
}

/**
 * Décorateur pour récupérer les informations d'organisateur de tournoi depuis la requête
 * Utilisé après TournamentOrganizerGuard ou TournamentOwnerGuard
 */
export const TournamentOrganizer = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext
  ): TournamentOrganizerEntity | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournamentOrganizer;
  }
);

/**
 * Décorateur pour récupérer les informations de tournoi depuis la requête
 * Utilisé après n'importe quel guard de tournoi
 */
export const Tournament = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TournamentEntity | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournament;
  }
);

/**
 * Décorateur pour récupérer les informations de joueur de tournoi depuis la requête
 * Utilisé après TournamentParticipantGuard
 */
export const TournamentPlayer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Player | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournamentPlayer;
  }
);

/**
 * Décorateur pour récupérer les informations d'inscription de tournoi depuis la requête
 * Utilisé après TournamentParticipantGuard
 */
export const TournamentRegistration = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext
  ): TournamentRegistrationEntity | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.tournamentRegistration;
  }
);
