import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards
} from '@nestjs/common';
import { DeckService } from './deck.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { DeckCardRole } from '../common/enums/deckCardRole';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('decks')
@Controller('decks')
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() createDeckDto: CreateDeckDto) {
    return this.deckService.create(createDeckDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: User
  ) {
    return this.deckService.findAllForUser(user as User, {
      userId,
      page,
      limit
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deckService.findOneWithCards(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id') id: string,
    @Body() updateDeckDto: UpdateDeckDto,
    @CurrentUser() user: User
  ) {
    return this.deckService.updateMeta(+id, updateDeckDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.deckService.delete(+id, user);
  }

  @Post(':id/cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  addCard(
    @Param('id') id: string,
    @Body() body: { cardId: string; qty: number; role?: DeckCardRole },
    @CurrentUser() user: User
  ) {
    return this.deckService.addCard(+id, body, user);
  }

  @Delete(':id/cards/:cardId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  removeCard(
    @Param('id') id: string,
    @Param('cardId') cardId: string,
    @CurrentUser() user: User
  ) {
    return this.deckService.removeCard(+id, cardId, user);
  }

  @Post(':id/clone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  clone(@Param('id') id: string, @CurrentUser() user: User) {
    return this.deckService.cloneDeck(+id, user);
  }
}
