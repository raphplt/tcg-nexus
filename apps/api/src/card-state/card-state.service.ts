import { Injectable } from '@nestjs/common';
import { CreateCardStateDto } from './dto/create-card-state.dto';
import { UpdateCardStateDto } from './dto/update-card-state.dto';

@Injectable()
export class CardStateService {
  create(createCardStateDto: CreateCardStateDto) {
    return 'This action adds a new cardState';
  }

  findAll() {
    return `This action returns all cardState`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cardState`;
  }

  update(id: number, updateCardStateDto: UpdateCardStateDto) {
    return `This action updates a #${id} cardState`;
  }

  remove(id: number) {
    return `This action removes a #${id} cardState`;
  }
}
