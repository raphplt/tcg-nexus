import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Request
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Request() req: ExpressRequest
  ) {
    const rememberMe = req.headers['x-remember-me'] === 'true';
    const result = await this.authService.login(loginDto);
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });
    res.json({ user: result.user, tokens: result.tokens });
    return;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response,
    @Request() req: ExpressRequest
  ) {
    const rememberMe = req.headers['x-remember-me'] === 'true';
    const result = await this.authService.register(registerDto);
    res.cookie('accessToken', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000
    });
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });
    res.json({ user: result.user });
    return;
  }

  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest
  ) {
    const rememberMe = req.headers['x-remember-me'] === 'true';
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken
    );
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });
    res.json({ success: true });
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User, @Res() res: Response) {
    await this.authService.logout(user.id);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
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
