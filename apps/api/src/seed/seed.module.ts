import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PokemonSerie } from '@/pokemon-series/entities/pokemon-sery.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PokemonSerie])],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
