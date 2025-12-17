import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Faq } from './entities/faq.entity';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Faq])],
  controllers: [FaqController],
  providers: [FaqService],
  exports: [FaqService]
})
export class FaqModule {}
