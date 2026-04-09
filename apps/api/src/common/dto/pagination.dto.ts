import { Transform } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
