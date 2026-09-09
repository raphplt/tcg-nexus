import { IsNotEmpty, IsNumber, IsPositive, IsString } from "class-validator";

/**
 * Payload for requesting a physical return on a delivered or shipped order item.
 */
export class CreateReturnDto {
  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
