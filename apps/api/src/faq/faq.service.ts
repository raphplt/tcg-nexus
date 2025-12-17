import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { GetFaqDto } from './dto/get-faq.dto';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>
  ) {}

  async findAll(filters: GetFaqDto = {}): Promise<Faq[]> {
    const query = this.faqRepository
      .createQueryBuilder('faq')
      .orderBy('faq.order', 'ASC')
      .addOrderBy('faq.createdAt', 'DESC');

    if (filters.category) {
      query.andWhere('faq.category = :category', {
        category: filters.category
      });
    }

    if (filters.search) {
      query.andWhere(
        '(faq.question ILIKE :search OR faq.answer ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return query.getMany();
  }
}
