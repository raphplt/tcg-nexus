import { Injectable } from '@nestjs/common';
import { CreateDeckCardDto } from './dto/create-deck-card.dto';
import { UpdateDeckCardDto } from './dto/update-deck-card.dto';

@Injectable()
export class DeckCardService {
  create(_createDeckCardDto: CreateDeckCardDto) {
    return 'This action adds a new deckCard';
  }

  findAll() {
    return `This action returns all deckCard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deckCard`;
  }

  update(id: number, _updateDeckCardDto: UpdateDeckCardDto) {
    return `This action updates a #${id} deckCard`;
  }

  remove(id: number) {
    return `This action removes a #${id} deckCard`;
  }
}
