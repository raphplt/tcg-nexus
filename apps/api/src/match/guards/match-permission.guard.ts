import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '../entities/match.entity';
import { TournamentOrganizer } from '../../tournament/entities/tournament-organizer.entity';
import { User, UserRole } from '../../user/entities/user.entity';
import { Request } from 'express';

@Injectable()
export class MatchPermissionGuard implements CanActivate {
  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(TournamentOrganizer)
    private organizerRepository: Repository<TournamentOrganizer>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user: User = request.user as User;
    const matchId = parseInt(request.params?.id);

    if (!user || !matchId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Super admin peut tout faire
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Récupérer le match avec les relations nécessaires
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: [
        'tournament',
        'playerA',
        'playerA.user',
        'playerB',
        'playerB.user'
      ]
    });

    if (!match) {
      throw new NotFoundException('Match non trouvé');
    }

    // Vérifier si l'utilisateur est un organisateur du tournoi
    const organizer = await this.organizerRepository.findOne({
      where: {
        tournament: { id: match.tournament.id },
        userId: user.id,
        isActive: true
      }
    });

    if (organizer) {
      return true; // Organisateur peut gérer tous les matches
    }

    // Vérifier si l'utilisateur est un des joueurs du match
    const isPlayerA = match.playerA?.user?.id === user.id;
    const isPlayerB = match.playerB?.user?.id === user.id;

    if (isPlayerA || isPlayerB) {
      // Les joueurs peuvent seulement reporter des scores, pas reset
      const action = this.getActionFromRequest(request);
      return action === 'report-score';
    }

    throw new ForbiddenException(
      "Vous n'avez pas les permissions pour effectuer cette action sur ce match"
    );
  }

  private getActionFromRequest(request: Request): string {
    const path = (request.route?.path as string) || request.url;
    if (path?.includes('report-score')) return 'report-score';
    if (path?.includes('reset')) return 'reset';
    if (path?.includes('start')) return 'start';
    return 'unknown';
  }
}
