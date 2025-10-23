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
}
