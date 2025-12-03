import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Request,
  UnauthorizedException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Response, Request as ExpressRequest } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards as UseGuardsDecorator } from '@nestjs/common';
import type { CookieOptions } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const buildCookieOptions = (
  req: ExpressRequest,
  maxAge?: number
): CookieOptions => {
  const explicitDomain = process.env.COOKIE_DOMAIN?.trim();

  let derivedDomain: string | undefined;

  if (!explicitDomain && process.env.FRONTEND_URL) {
    try {
      const parsedUrl = new URL(process.env.FRONTEND_URL);
      const frontendHost = parsedUrl.hostname.replace(/^www\./, '');
      const requestHost = (req.hostname || req.headers.host || '').toString();

      if (requestHost.endsWith(frontendHost)) {
        derivedDomain = frontendHost;
      }
    } catch (error) {
      console.error('Unable to derive cookie domain from FRONTEND_URL', error);
    }
  }

  const baseCookie: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    domain: explicitDomain || derivedDomain
  };

  return maxAge ? { ...baseCookie, maxAge } : baseCookie;
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Request() req: ExpressRequest
  ) {
    const rememberMe = req.headers['x-remember-me'] === 'true';
    const result = await this.authService.login(loginDto);
    res.cookie(
      'accessToken',
      result.tokens.accessToken,
      buildCookieOptions(
        req,
        rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000
      )
    );
    res.cookie(
      'refreshToken',
      result.tokens.refreshToken,
      buildCookieOptions(
        req,
        rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      )
    );
    res.json({ user: result.user });
    return;
  }
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300 } })
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response,
    @Request() req: ExpressRequest
  ) {
    const rememberMe = req.headers['x-remember-me'] === 'true';
    const result = await this.authService.register(registerDto);
    res.cookie(
      'accessToken',
      result.tokens.accessToken,
      buildCookieOptions(
        req,
        rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000
      )
    );
    res.cookie(
      'refreshToken',
      result.tokens.refreshToken,
      buildCookieOptions(
        req,
        rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      )
    );
    res.json({ user: result.user });
    return;
  }

  @UseGuards(JwtRefreshGuard)
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300 } })
  @ApiBearerAuth()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest
  ) {
    const rememberMe = req.headers['x-remember-me'] === 'true';
    if (!user.refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken
    );
    res.cookie(
      'accessToken',
      tokens.accessToken,
      buildCookieOptions(
        req,
        rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000
      )
    );
    res.cookie(
      'refreshToken',
      tokens.refreshToken,
      buildCookieOptions(
        req,
        rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      )
    );
    res.json({ success: true });
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest
  ) {
    await this.authService.logout(user.id);
    const baseCookieOptions = buildCookieOptions(req);

    res.clearCookie('accessToken', baseCookieOptions);
    res.clearCookie('refreshToken', baseCookieOptions);
    res.json({ message: 'Logged out successfully' });
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isPro: user.isPro
    };
  }
}
