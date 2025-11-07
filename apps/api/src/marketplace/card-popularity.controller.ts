import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Ip
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CardPopularityService } from './card-popularity.service';
import {
  CreateCardEventDto,
  GetPopularCardsQueryDto,
  GetTrendingCardsQueryDto
} from './dto/card-popularity.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entity';

@ApiTags('marketplace')
@Controller('marketplace')
export class CardPopularityController {
  constructor(private readonly cardPopularityService: CardPopularityService) {}

  @Post('events')
  @Public()
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Enregistre un événement de carte' })
  @ApiResponse({ status: 201, description: 'Événement enregistré' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  async recordEvent(
    @Body() dto: CreateCardEventDto,
    @CurrentUser() user?: User,
    @Ip() ipAddress?: string,
    @Req() req?: any
  ) {
    await this.cardPopularityService.recordEvent(
      dto,
      user?.id,
      ipAddress,
      req?.headers?.['user-agent'] as string | undefined,
      dto.sessionId
    );

    return { success: true };
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Récupère les cartes populaires' })
  async getPopularCards(@Query() query: GetPopularCardsQueryDto) {
    return this.cardPopularityService.getPopularCards(query.limit || 10);
  }

  @Get('trending')
  @Public()
  @ApiOperation({ summary: 'Récupère les cartes en tendance' })
  async getTrendingCards(@Query() query: GetTrendingCardsQueryDto) {
    return this.cardPopularityService.getTrendingCards(
      query.limit || 10,
      query.excludePopular === true
    );
  }
}
