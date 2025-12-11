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
import { DeckService, FindAllDecksParams } from './deck.service';
import { CreateDeckDto } from './dto/create-deck.dto';
import { UpdateDeckDto } from './dto/update-deck.dto';
import { ShareDeckDto } from './dto/share-deck.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('decks')
@Controller('deck')
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: User, @Body() createDeckDto: CreateDeckDto) {
    return this.deckService.createDeck(user, createDeckDto);
  }

  @Public()
  @Get()
  findAll(@Query() query: FindAllDecksParams) {
    return this.deckService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  findAllFromUSer(
    @CurrentUser() user: User,
    @Query() query: FindAllDecksParams
  ) {
    return this.deckService.findAllFromUser(user, query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deckService.findOneWithCards(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateDeckDto: UpdateDeckDto
  ) {
    return this.deckService.updateDeck(+id, user, updateDeckDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deckService.remove(+id);
  }

  @Post(':id/clone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  clone(@Param('id') id: string, @CurrentUser() user: User) {
    return this.deckService.cloneDeck(+id, user);
  }

  @Public()
  @Post(':id/view')
  incrementView(@Param('id') id: string) {
    return this.deckService.incrementViews(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/share')
  @ApiBearerAuth()
  share(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto?: ShareDeckDto
  ) {
    return this.deckService.shareDeck(+id, user, dto);
  }

  @Public()
  @Get('import/:code')
  getDeckForImport(@Param('code') code: string) {
    return this.deckService.getDeckForImport(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('import/:code')
  @ApiBearerAuth()
  importDeck(@Param('code') code: string, @CurrentUser() user: User) {
    return this.deckService.importDeck(code, user);
  }
}
