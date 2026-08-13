import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { UserRole } from "src/common/enums/user";
import { Repository } from "typeorm";
import { Tournament } from "../entities/tournament.entity";
import {
  OrganizerRole,
  TournamentOrganizer,
} from "../entities/tournament-organizer.entity";

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

export const TOURNAMENT_ORGANIZER_ROLES_KEY = "tournament_organizer_roles";
export const TournamentOrganizerRoles = (...roles: OrganizerRole[]) =>
  SetMetadata(TOURNAMENT_ORGANIZER_ROLES_KEY, roles);

@Injectable()
export class TournamentOrganizerGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(TournamentOrganizer)
    private organizerRepository: Repository<TournamentOrganizer>,
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizerRole[]>(
      TOURNAMENT_ORGANIZER_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no organizer role is required, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const tournamentId = request.params.id || request.params.tournamentId;

    if (!user || !tournamentId) {
      throw new ForbiddenException("Utilisateur ou ID de tournoi manquant");
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
      return true;
    }

    // Verify tournament existence
    const tournament = await this.tournamentRepository.findOne({
      where: { id: parseInt(tournamentId) },
    });

    if (!tournament) {
      throw new NotFoundException({
        code: "TOURNAMENT_NOT_FOUND",
        message: "Tournoi non trouvé",
      });
    }

    // Verify whether user is an active tournament organizer
    const organizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: parseInt(tournamentId) },
        user: { id: user.id },
        isActive: true,
      },
    });

    if (!organizer) {
      throw new ForbiddenException(
        "Vous n'êtes pas organisateur de ce tournoi",
      );
    }

    // Check whether user holds required organizer role
    const hasRequiredRole = requiredRoles.some(
      (role) => organizer.role === role,
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Rôle requis: ${requiredRoles.join(" ou ")}. Votre rôle: ${organizer.role}`,
      );
    }

    // Attach organizer context to request object
    request.tournamentOrganizer = organizer;
    request.tournament = tournament;

    return true;
  }
}
