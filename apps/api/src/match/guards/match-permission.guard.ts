import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { UserRole } from "src/common/enums/user";
import { Repository } from "typeorm";
import { TournamentOrganizer } from "../../tournament/entities/tournament-organizer.entity";
import { User } from "../../user/entities/user.entity";
import { Match } from "../entities/match.entity";

@Injectable()
export class MatchPermissionGuard implements CanActivate {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(TournamentOrganizer)
    private organizerRepository: Repository<TournamentOrganizer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user: User = request.user as User;

    if (!user) {
      throw new ForbiddenException({
        code: "UNAUTHORIZED_ACCESS",
        message: "Accès non autorisé",
      });
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const action = this.getActionFromRequest(request);

    if (action === "create") {
      const tournamentId = Number(
        (request.body as { tournamentId?: number } | undefined)?.tournamentId,
      );

      if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
        throw new ForbiddenException("Tournoi invalide");
      }

      const organizer = await this.organizerRepository.findOne({
        where: {
          tournament: { id: tournamentId },
          user: { id: user.id },
          isActive: true,
        },
      });

      if (!organizer) {
        throw new ForbiddenException(
          "Seul un organisateur actif peut créer un match",
        );
      }

      return true;
    }

    const matchId = Number(request.params?.id);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      throw new ForbiddenException({
        code: "UNAUTHORIZED_ACCESS",
        message: "Accès non autorisé",
      });
    }

    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: [
        "tournament",
        "playerA",
        "playerA.user",
        "playerB",
        "playerB.user",
      ],
    });

    if (!match) {
      throw new NotFoundException({
        code: "MATCH_NOT_FOUND",
        message: "Match non trouvé",
      });
    }

    const organizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: match.tournament.id },
        user: { id: user.id },
        isActive: true,
      },
    });

    if (organizer) {
      return true;
    }

    const isPlayerA = match.playerA?.user?.id === user.id;
    const isPlayerB = match.playerB?.user?.id === user.id;

    if (isPlayerA || isPlayerB) {
      return action === "report-score" || action === "read";
    }

    throw new ForbiddenException(
      "Vous n'avez pas les permissions pour effectuer cette action sur ce match",
    );
  }

  private getActionFromRequest(request: Request): string {
    const path = (request.route?.path as string) || request.url;
    if (path?.includes("report-score")) return "report-score";
    if (path?.includes("reset")) return "reset";
    if (path?.includes("start")) return "start";
    if (request.method === "POST" && !request.params?.id) return "create";
    if (request.method === "GET") return "read";
    if (request.method === "PATCH") return "update";
    if (request.method === "DELETE") return "delete";
    return "unknown";
  }
}
