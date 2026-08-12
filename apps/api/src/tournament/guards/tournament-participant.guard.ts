import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { Player } from "../../player/entities/player.entity";
import { Tournament } from "../entities/tournament.entity";
import {
  RegistrationStatus,
  TournamentRegistration,
} from "../entities/tournament-registration.entity";

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
    private playerRepository: Repository<Player>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const tournamentId = request.params.id || request.params.tournamentId;
    const playerId = request.params.playerId;

    if (!user || !tournamentId) {
      throw new ForbiddenException("Utilisateur ou ID de tournoi manquant");
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

    // If explicit playerId specified, verify ownership by current user
    if (playerId) {
      const player = await this.playerRepository.findOne({
        where: { id: parseInt(playerId), user: { id: user.id } },
      });

      if (!player) {
        throw new ForbiddenException("Ce joueur ne vous appartient pas");
      }

      // Verify player registration status for tournament
      const registration = await this.registrationRepository.findOne({
        where: {
          tournament: { id: parseInt(tournamentId) },
          player: { id: parseInt(playerId) },
          status: Not(RegistrationStatus.CANCELLED),
        },
      });

      if (!registration) {
        throw new ForbiddenException(
          "Ce joueur n'est pas inscrit à ce tournoi",
        );
      }

      request.tournamentPlayer = player;
      request.tournamentRegistration = registration;
    } else {
      // If no explicit playerId provided, check user's registered player profile
      const player = await this.playerRepository.findOne({
        where: { user: { id: user.id } },
      });

      if (!player) {
        throw new ForbiddenException(
          "Vous devez avoir un profil joueur pour participer",
        );
      }

      const registration = await this.registrationRepository.findOne({
        where: {
          tournament: { id: parseInt(tournamentId) },
          player: { id: player.id },
          status: Not(RegistrationStatus.CANCELLED),
        },
      });

      if (!registration) {
        throw new ForbiddenException({
        code: "NOT_REGISTERED_TO_TOURNAMENT",
        message: "Vous n'êtes pas inscrit à ce tournoi",
      });
      }

      request.tournamentPlayer = player;
      request.tournamentRegistration = registration;
    }

    request.tournament = tournament;
    return true;
  }
}
