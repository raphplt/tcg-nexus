import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';
import { FaqService } from './faq.service';
import { GetFaqDto } from './dto/get-faq.dto';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @Public()
  findAll(@Query() query: GetFaqDto) {
    return this.faqService.findAll(query);
  }
}
