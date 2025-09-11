import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TournamentRegistration,
  RegistrationStatus
} from '../entities/tournament-registration.entity';
import { Tournament } from '../entities/tournament.entity';
import { Player } from '../../player/entities/player.entity';

interface AuthenticatedRequest {
  user: {
    id: number;
    player?: Player;
  };
  params: {
    id?: string;
    tournamentId?: string;
    playerId?: string;
  };
  tournamentPlayer?: Player;
  tournamentRegistration?: TournamentRegistration;
  tournament?: Tournament;
}

@Injectable()
export class TournamentParticipantGuard implements CanActivate {
  constructor(
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const tournamentId = request.params.id || request.params.tournamentId;
    const playerId = request.params.playerId;

    if (!user || !tournamentId) {
      throw new ForbiddenException('Utilisateur ou ID de tournoi manquant');
    }

    // Vérifier que le tournoi existe
    const tournament = await this.tournamentRepository.findOne({
      where: { id: parseInt(tournamentId) }
    });

    if (!tournament) {
      throw new ForbiddenException('Tournoi non trouvé');
    }

    // Si un playerId est spécifié, vérifier que c'est le joueur de l'utilisateur
    if (playerId) {
      const player = await this.playerRepository.findOne({
        where: { id: parseInt(playerId), user: { id: user.id } }
      });

      if (!player) {
        throw new ForbiddenException('Ce joueur ne vous appartient pas');
      }

      // Vérifier que le joueur est inscrit au tournoi
      const registration = await this.registrationRepository.findOne({
        where: {
          tournament: { id: parseInt(tournamentId) },
          player: { id: parseInt(playerId) },
          status: RegistrationStatus.CONFIRMED
        }
      });

      if (!registration) {
        throw new ForbiddenException(
          "Ce joueur n'est pas inscrit à ce tournoi"
        );
      }

      request.tournamentPlayer = player;
      request.tournamentRegistration = registration;
    } else {
      // Si pas de playerId spécifié, vérifier que l'utilisateur a au moins un joueur inscrit
      const player = await this.playerRepository.findOne({
        where: { user: { id: user.id } }
      });

      if (!player) {
        throw new ForbiddenException(
          'Vous devez avoir un profil joueur pour participer'
        );
      }

      const registration = await this.registrationRepository.findOne({
        where: {
          tournament: { id: parseInt(tournamentId) },
          player: { id: player.id },
          status: RegistrationStatus.CONFIRMED
        }
      });

      if (!registration) {
        throw new ForbiddenException("Vous n'êtes pas inscrit à ce tournoi");
      }

      request.tournamentPlayer = player;
      request.tournamentRegistration = registration;
    }

    request.tournament = tournament;
    return true;
  }
}
