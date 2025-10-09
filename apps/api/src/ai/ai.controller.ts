import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { AnalyzeDeckDto } from './dto/analyze-deck.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyzeDeck')
  analyzeDeck(@Body() analyzeDeckDto: AnalyzeDeckDto) {
    return this.aiService.analyzeDeck(analyzeDeckDto);
  }
}
