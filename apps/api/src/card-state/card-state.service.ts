import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCardStateDto } from "./dto/create-card-state.dto";
import { UpdateCardStateDto } from "./dto/update-card-state.dto";
import { CardState, CardStateCode } from "./entities/card-state.entity";

/**
 * Service managing card condition classifications.
 */
@Injectable()
export class CardStateService {
  constructor(
    @InjectRepository(CardState)
    private readonly cardStateRepository: Repository<CardState>,
  ) {}

  /**
   * Creates and persists a new card condition state.
   *
   * @param createCardStateDto Creation parameters.
   * @returns Persisted card state entity.
   */
  async create(createCardStateDto: CreateCardStateDto): Promise<CardState> {
    const cardState = this.cardStateRepository.create(createCardStateDto);
    return this.cardStateRepository.save(cardState);
  }

  /**
   * Retrieves all available card condition states ordered by identifier.
   *
   * @returns Array of card state records.
   */
  async findAll(): Promise<CardState[]> {
    return this.cardStateRepository.find();
  }

  /**
   * Finds a card condition state by its primary key ID.
   *
   * @param id Unique numeric identifier.
   * @returns Found card state.
   * @throws NotFoundException When no card state exists with the specified ID.
   */
  async findOne(id: number): Promise<CardState> {
    const cardState = await this.cardStateRepository.findOne({ where: { id } });
    if (!cardState) {
      throw new NotFoundException(`CardState with id ${id} not found`);
    }
    return cardState;
  }

  /**
   * Finds a card condition state by its standard classification code.
   *
   * @param code Condition code (NM, EX, GD, LP, PL, Poor).
   * @returns Matching card state or null if not found.
   */
  async findByCode(code: CardStateCode): Promise<CardState | null> {
    return this.cardStateRepository.findOne({
      where: { code },
    });
  }

  /**
   * Updates an existing card condition state.
   *
   * @param id Identifier of the card state to update.
   * @param updateCardStateDto Updated properties.
   * @returns Updated card state entity.
   * @throws NotFoundException When the card state does not exist.
   */
  async update(
    id: number,
    updateCardStateDto: UpdateCardStateDto,
  ): Promise<CardState> {
    const cardState = await this.findOne(id);
    Object.assign(cardState, updateCardStateDto);
    return this.cardStateRepository.save(cardState);
  }

  /**
   * Deletes a card condition state by ID.
   *
   * @param id Identifier of the card state to delete.
   * @throws NotFoundException When the card state does not exist.
   */
  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.cardStateRepository.delete(id);
  }
}
