import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCardStateDto } from './dto/create-card-state.dto';
import { UpdateCardStateDto } from './dto/update-card-state.dto';
import { CardState, CardStateCode } from './entities/card-state.entity';

@Injectable()
export class CardStateService {
  constructor(
    @InjectRepository(CardState)
    private cardStateRepository: Repository<CardState>
  ) {}

  async create(createCardStateDto: CreateCardStateDto): Promise<CardState> {
    const cardState = this.cardStateRepository.create(createCardStateDto);
    return this.cardStateRepository.save(cardState);
  }

  async findAll(): Promise<CardState[]> {
    return this.cardStateRepository.find();
  }

  async findOne(id: number): Promise<CardState> {
    const cardState = await this.cardStateRepository.findOne({ where: { id } });
    if (!cardState) {
      throw new Error(`CardState with id ${id} not found`);
    }
    return cardState;
  }

  async findByCode(code: CardStateCode): Promise<CardState | null> {
    const cardState = await this.cardStateRepository.findOne({
      where: { code }
    });
    return cardState;
  }

  async update(
    id: number,
    updateCardStateDto: UpdateCardStateDto
  ): Promise<CardState> {
    await this.cardStateRepository.update(id, updateCardStateDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.cardStateRepository.delete(id);
  }
}
