import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "../../user/entities/user.entity";
import { UserService } from "../../user/user.service";
import { JwtPayload } from "../interfaces/auth.interface";

const extractRefreshToken = (req: Request): string | null => {
  if (!req) {
    return null;
  }

  const cookieToken = req.cookies?.refreshToken as string | undefined;
  if (cookieToken) {
    return cookieToken;
  }

  const headerToken = req.headers["x-refresh-token"];
  if (typeof headerToken === "string" && headerToken.length > 0) {
    return headerToken;
  }

  const authHeaderToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (authHeaderToken) {
    return authHeaderToken;
  }

  const bodyToken = req.body?.refreshToken;
  if (typeof bodyToken === "string" && bodyToken.length > 0) {
    return bodyToken;
  }

  return null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) {
    const refreshSecret = configService.get<string>("JWT_REFRESH_SECRET");

    if (!refreshSecret) {
      throw new Error(
        "JWT_REFRESH_SECRET must be defined in environment variables",
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractRefreshToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<User & { refreshToken?: string }> {
    const refreshToken = extractRefreshToken(req) ?? undefined;
    const user = await this.userService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
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
