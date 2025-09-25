import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/entities/user.entity';
import { ROLES_KEY, AllowedRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AllowedRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Si aucun rôle n'est requis, l'accès est autorisé
    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: { role: UserRole; isPro?: boolean } }>();

    const user = request.user;

    // Vérifie si l'utilisateur a l'un des rôles requis, ou le flag pro
    return requiredRoles.some((role) => {
      if (role === 'pro') {
        return Boolean(user.isPro);
      }
      return user.role === role;
    });
  }
}
