import { PartialType } from '@nestjs/swagger';
import { CreateUserCartDto } from './create-user_cart.dto';

export class UpdateUserCartDto extends PartialType(CreateUserCartDto) {}
