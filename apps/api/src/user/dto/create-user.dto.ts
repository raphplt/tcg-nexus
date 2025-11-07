import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum
} from 'class-validator';
import { UserRole } from 'src/common/enums/user';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
