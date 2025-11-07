import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user';
import { AchievementService } from './achievement.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';

@Controller('achievements')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  // ==================== ENDPOINTS PUBLICS/AUTHENTIFIÉS ====================

  /**
   * Liste tous les achievements disponibles
   * GET /achievements
   */
  @Get()
  async findAll() {
    return this.achievementService.findAllAchievements();
  }

  /**
   * Récupère un achievement par son ID
   * GET /achievements/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.achievementService.findAchievementById(id);
  }

  /**
   * Récupère tous les achievements d'un utilisateur avec leur progression
   * GET /achievements/user/:userId
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserAchievements(@Param('userId', ParseIntPipe) userId: number) {
    return this.achievementService.getUserAchievements(userId);
  }

  /**
   * Récupère les achievements débloqués d'un utilisateur
   * GET /achievements/user/:userId/unlocked
   */
  @Get('user/:userId/unlocked')
  @UseGuards(JwtAuthGuard)
  async getUserUnlockedAchievements(@Param('userId', ParseIntPipe) userId: number) {
    return this.achievementService.getUserUnlockedAchievements(userId);
  }

  /**
   * Récupère les statistiques des achievements d'un utilisateur
   * GET /achievements/user/:userId/stats
   */
  @Get('user/:userId/stats')
  @UseGuards(JwtAuthGuard)
  async getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.achievementService.getUserAchievementStats(userId);
  }

  /**
   * Récupère les achievements non notifiés de l'utilisateur connecté
   * GET /achievements/me/unnotified
   */
  @Get('me/unnotified')
  @UseGuards(JwtAuthGuard)
  async getMyUnnotifiedAchievements(@Request() req) {
    return this.achievementService.getUnnotifiedAchievements(req.user.id);
  }

  /**
   * Marque un achievement comme notifié
   * POST /achievements/user-achievement/:id/notify
   */
  @Post('user-achievement/:id/notify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsNotified(@Param('id', ParseIntPipe) id: number) {
    await this.achievementService.markAsNotified(id);
  }

  // ==================== ENDPOINTS ADMIN ====================

  /**
   * Crée un nouvel achievement (Admin uniquement)
   * POST /achievements
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createAchievementDto: CreateAchievementDto) {
    return this.achievementService.createAchievement(createAchievementDto);
  }

  /**
   * Met à jour un achievement (Admin uniquement)
   * PUT /achievements/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAchievementDto: UpdateAchievementDto
  ) {
    return this.achievementService.updateAchievement(id, updateAchievementDto);
  }

  /**
   * Supprime un achievement (Admin uniquement)
   * DELETE /achievements/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.achievementService.deleteAchievement(id);
  }
}

