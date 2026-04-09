import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Request,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UserService } from "../user/user.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { User } from "../user/entities/user.entity";
import { Response, Request as ExpressRequest } from "express";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Public } from "./decorators/public.decorator";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { UseGuards as UseGuardsDecorator } from "@nestjs/common";
import type { CookieOptions } from "express";

const isProduction = process.env.NODE_ENV === "production";

const buildCookieOptions = (
  req: ExpressRequest,
  maxAge?: number,
): CookieOptions => {
  const explicitDomain = process.env.COOKIE_DOMAIN?.trim();

  let derivedDomain: string | undefined;

  if (!explicitDomain && process.env.FRONTEND_URL) {
    try {
      const parsedUrl = new URL(process.env.FRONTEND_URL);
      const frontendHost = parsedUrl.hostname.replace(/^www\./, "");
      const requestHost = (req.hostname || req.headers.host || "").toString();

      if (requestHost.endsWith(frontendHost)) {
        derivedDomain = frontendHost;
      }
    } catch (error) {
      console.error("Unable to derive cookie domain from FRONTEND_URL", error);
    }
  }

  const baseCookie: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    domain: explicitDomain || derivedDomain,
  };

  return maxAge ? { ...baseCookie, maxAge } : baseCookie;
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * Calcule la maxAge à appliquer aux deux cookies d'auth.
   *
   * - Le cookie accessToken est légèrement plus long que le JWT lui-même pour
   *   que l'intercepteur 401 puisse toujours déclencher un refresh même quand
   *   le JWT vient juste d'expirer (sinon le navigateur supprimerait le cookie
   *   avant qu'on ait l'occasion d'agir).
   * - Le cookie refreshToken vit aussi longtemps que le JWT refresh quand
   *   `rememberMe=true`. Sinon on retourne `undefined` → cookie de session,
   *   supprimé à la fermeture du navigateur.
   */
  private getCookieMaxAges(rememberMe: boolean): {
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number | undefined;
  } {
    const accessTtl = this.authService.getAccessTokenTtlMs();
    const refreshTtl = this.authService.getRefreshTokenTtlMs();
    return {
      accessTokenMaxAge: refreshTtl > accessTtl ? refreshTtl : accessTtl,
      refreshTokenMaxAge: rememberMe ? refreshTtl : undefined,
    };
  }

  @UseGuards(LocalAuthGuard)
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    const rememberMe = req.headers["x-remember-me"] === "true";
    const result = await this.authService.login(loginDto);
    const { accessTokenMaxAge, refreshTokenMaxAge } =
      this.getCookieMaxAges(rememberMe);

    res.cookie(
      "accessToken",
      result.tokens.accessToken,
      buildCookieOptions(req, accessTokenMaxAge),
    );
    res.cookie(
      "refreshToken",
      result.tokens.refreshToken,
      buildCookieOptions(req, refreshTokenMaxAge),
    );
    res.json({
      user: result.user,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
    });
    return;
  }
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300 } })
  @Post("register")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    const rememberMe = req.headers["x-remember-me"] === "true";
    const result = await this.authService.register(registerDto);
    const { accessTokenMaxAge, refreshTokenMaxAge } =
      this.getCookieMaxAges(rememberMe);

    res.cookie(
      "accessToken",
      result.tokens.accessToken,
      buildCookieOptions(req, accessTokenMaxAge),
    );
    res.cookie(
      "refreshToken",
      result.tokens.refreshToken,
      buildCookieOptions(req, refreshTokenMaxAge),
    );
    res.json({
      user: result.user,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
    });
    return;
  }

  @UseGuards(JwtRefreshGuard)
  @UseGuardsDecorator(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300 } })
  @ApiBearerAuth()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    const rememberMe = req.headers["x-remember-me"] === "true";
    if (!user.refreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );
    const { accessTokenMaxAge, refreshTokenMaxAge } =
      this.getCookieMaxAges(rememberMe);

    res.cookie(
      "accessToken",
      tokens.accessToken,
      buildCookieOptions(req, accessTokenMaxAge),
    );
    res.cookie(
      "refreshToken",
      tokens.refreshToken,
      buildCookieOptions(req, refreshTokenMaxAge),
    );
    res.json({
      success: true,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    });
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Request() req: ExpressRequest,
  ) {
    await this.authService.logout(user.id);
    const baseCookieOptions = buildCookieOptions(req);

    res.clearCookie("accessToken", baseCookieOptions);
    res.clearCookie("refreshToken", baseCookieOptions);
    res.json({ message: "Logged out successfully" });
    return;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("profile")
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: User) {
    return this.userService.findOne(user.id);
  }
}
