import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common';
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
    role: string;
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
    private tournamentRepository: Repository<Tournament>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const tournamentId = request.params.id || request.params.tournamentId;

    if (!user || !tournamentId) {
      throw new ForbiddenException('Utilisateur ou ID de tournoi manquant');
    }

    if (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.MODERATOR
    ) {
      return true;
    }

    // Vérifier que le tournoi existe
    const tournament = await this.tournamentRepository.findOne({
      where: { id: parseInt(tournamentId) }
    });

    if (!tournament) {
      throw new ForbiddenException('Tournoi non trouvé');
    }

    // Vérifier si l'utilisateur est propriétaire du tournoi
    const organizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: parseInt(tournamentId) },
        user: { id: user.id },
        role: OrganizerRole.OWNER,
        isActive: true
      }
    });

    if (!organizer) {
      throw new ForbiddenException(
        "Vous n'êtes pas propriétaire de ce tournoi"
      );
    }

    // Ajouter les informations à la requête pour utilisation ultérieure
    request.tournamentOrganizer = organizer;
    request.tournament = tournament;

    return true;
  }
}
