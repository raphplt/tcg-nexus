import { Injectable } from '@nestjs/common';

@Injectable()
export class DeckService {
  create() {
    return 'This action adds a new deck';
  }

  findAll() {
    return `This action returns all deck`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deck`;
  }

  update(id: number) {
    return `This action updates a #${id} deck`;
  }

  remove(id: number) {
    return `This action removes a #${id} deck`;
  }
}
