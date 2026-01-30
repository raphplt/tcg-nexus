import { IsOptional, IsString } from 'class-validator';

export class CreatePokemonSeryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;
}
