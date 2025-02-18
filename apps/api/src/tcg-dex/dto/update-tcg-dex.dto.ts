import { PartialType } from '@nestjs/mapped-types';
import { CreateTcgDexDto } from './create-tcg-dex.dto';

export class UpdateTcgDexDto extends PartialType(CreateTcgDexDto) {}
