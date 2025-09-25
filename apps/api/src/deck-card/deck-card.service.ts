import { Injectable } from '@nestjs/common';

@Injectable()
export class DeckCardService {
  create() {
    return 'This action adds a new deckCard';
  }

  findAll() {
    return `This action returns all deckCard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deckCard`;
  }

  update(id: number) {
    return `This action updates a #${id} deckCard`;
  }

  remove(id: number) {
    return `This action removes a #${id} deckCard`;
  }
}
