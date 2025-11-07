import { IsInt, IsNotEmpty, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCartItemDto {
  @ApiProperty({
    description: 'ID du listing à ajouter au panier',
    example: 1
  })
  @IsInt()
  @IsNotEmpty()
  @IsPositive()
  listingId: number;

  @ApiProperty({
    description: 'Quantité à ajouter au panier',
    example: 1,
    default: 1,
    minimum: 1
  })
  @IsInt()
  @Min(1)
  quantity: number = 1;
}
