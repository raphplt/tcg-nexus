import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/auth.interface';
import { UserService } from '../../user/user.service';
import { User } from '../../user/entities/user.entity';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh'
) {
  constructor(
    private configService: ConfigService,
    private userService: UserService
  ) {
    const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

    if (!refreshSecret) {
      throw new Error(
        'JWT_REFRESH_SECRET must be defined in environment variables'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req && req.cookies) {
            return (req.cookies['refreshToken'] as string) || null;
          }
          return null;
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
      passReqToCallback: true
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload
  ): Promise<User & { refreshToken?: string }> {
    const refreshToken: string | undefined = req.cookies?.refreshToken as
      | string
      | undefined;
    console.log('JwtRefreshStrategy validate', {
      hasCookie: !!refreshToken,
      sub: payload.sub
    });
    const user = await this.userService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const result: User & { refreshToken?: string } = { ...user } as User & {
      refreshToken?: string;
    };
    if (refreshToken) {
      result.refreshToken = refreshToken;
    }
    return result;
  }
}
