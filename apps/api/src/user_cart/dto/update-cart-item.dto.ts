import { PartialType } from '@nestjs/swagger';
import { CreateCartItemDto } from './create-cart-item.dto';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto extends PartialType(CreateCartItemDto) {
  @ApiProperty({
    description: 'Nouvelle quantité pour cet item',
    example: 2,
    minimum: 1,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
