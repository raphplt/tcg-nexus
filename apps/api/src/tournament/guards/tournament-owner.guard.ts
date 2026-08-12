import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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

@Injectable()
export class TournamentOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(TournamentOrganizer)
    private organizerRepository: Repository<TournamentOrganizer>,
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Verify whether user is the tournament owner
    const organizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: parseInt(tournamentId) },
        user: { id: user.id },
        role: OrganizerRole.OWNER,
        isActive: true,
      },
    });

    if (!organizer) {
      throw new ForbiddenException(
        "Vous n'êtes pas propriétaire de ce tournoi",
      );
    }

    // Attach organizer context to request object
    request.tournamentOrganizer = organizer;
    request.tournament = tournament;

    return true;
  }
}
