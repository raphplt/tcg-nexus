import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeckFormat } from './entities/deck-format.entity';
@Injectable()
export class DeckFormatService {
  constructor(
    @InjectRepository(DeckFormat)
    private readonly deckFormatRepository: Repository<DeckFormat>
  ) {}

  async findAll(): Promise<DeckFormat[]> {
    return this.deckFormatRepository.find();
  }
}
