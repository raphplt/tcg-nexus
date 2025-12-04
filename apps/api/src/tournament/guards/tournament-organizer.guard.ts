import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TournamentOrganizer,
  OrganizerRole
} from '../entities/tournament-organizer.entity';
import { Tournament } from '../entities/tournament.entity';
import { UserRole } from 'src/common/enums/user';

interface AuthenticatedRequest {
  user: {
    id: number;
    role: UserRole;
  };
  params: {
    id?: string;
    tournamentId?: string;
  };
  tournamentOrganizer?: TournamentOrganizer;
  tournament?: Tournament;
}

export const TOURNAMENT_ORGANIZER_ROLES_KEY = 'tournament_organizer_roles';
export const TournamentOrganizerRoles = (...roles: OrganizerRole[]) =>
  SetMetadata(TOURNAMENT_ORGANIZER_ROLES_KEY, roles);

@Injectable()
export class TournamentOrganizerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(TournamentOrganizer)
    private organizerRepository: Repository<TournamentOrganizer>,
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizerRole[]>(
      TOURNAMENT_ORGANIZER_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Si aucun rôle d'organisateur n'est requis, l'accès est autorisé
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const tournamentId = request.params.id || request.params.tournamentId;

    if (!user || !tournamentId) {
      throw new ForbiddenException('Utilisateur ou ID de tournoi manquant');
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
      return true;
    }

    // Vérifier que le tournoi existe
    const tournament = await this.tournamentRepository.findOne({
      where: { id: parseInt(tournamentId) }
    });

    if (!tournament) {
      throw new ForbiddenException('Tournoi non trouvé');
    }

    // Vérifier si l'utilisateur est organisateur du tournoi
    const organizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: parseInt(tournamentId) },
        user: { id: user.id },
        isActive: true
      }
    });

    if (!organizer) {
      throw new ForbiddenException(
        "Vous n'êtes pas organisateur de ce tournoi"
      );
    }

    // Vérifier si l'utilisateur a l'un des rôles requis
    const hasRequiredRole = requiredRoles.some(
      (role) => organizer.role === role
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Rôle requis: ${requiredRoles.join(' ou ')}. Votre rôle: ${organizer.role}`
      );
    }

    // Ajouter les informations d'organisateur à la requête pour utilisation ultérieure
    request.tournamentOrganizer = organizer;
    request.tournament = tournament;

    return true;
  }
}
