import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { UserRole } from "src/common/enums/user";
import { Repository } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { Tournament } from "../entities/tournament.entity";
import { TournamentOrganizer } from "../entities/tournament-organizer.entity";

@Injectable()
export class TournamentVisibilityGuard implements CanActivate {
  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentOrganizer)
    private readonly organizerRepository: Repository<TournamentOrganizer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tournamentId = Number(request.params?.id);

    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    const tournament = await this.tournamentRepository.findOne({
      where: { id: tournamentId },
      select: { id: true, isPublic: true },
    });

    if (!tournament) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    if (tournament.isPublic) {
      return true;
    }

    const user = request.user as User | undefined;
    if (!user) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
      return true;
    }

    const organizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: tournamentId },
        user: { id: user.id },
        isActive: true,
      },
      select: { id: true },
    });

    if (!organizer) {
      throw new NotFoundException("Tournoi non trouvé");
    }

    return true;
  }
}
