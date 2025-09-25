import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../user/entities/user.entity';

export const ROLES_KEY = 'roles';
export type AllowedRole = UserRole | 'pro';
export const Roles = (...roles: AllowedRole[]) => SetMetadata(ROLES_KEY, roles);
