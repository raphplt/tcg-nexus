import { Module } from '@nestjs/common';
import { TcgDexService } from './tcg-dex.service';
import { TcgDexController } from './tcg-dex.controller';

@Module({
  controllers: [TcgDexController],
  providers: [TcgDexService],
})
export class TcgDexModule {}
