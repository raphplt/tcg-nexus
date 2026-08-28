import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectionModule } from "src/collection/collection.module";
import { Player } from "src/player/entities/player.entity";
import { Collection } from "src/collection/entities/collection.entity";
import { User } from "src/user/entities/user.entity";
import { UserModule } from "src/user/user.module";
import { AuthIdentity } from "./entities/auth-identity.entity";
import { OAuthController } from "./oauth/oauth.controller";
import { OAuthService } from "./oauth/oauth.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { LocalStrategy } from "./strategies/local.strategy";

@Module({
  imports: [
    ConfigModule,
    UserModule,
    PassportModule,
    CollectionModule,
    TypeOrmModule.forFeature([AuthIdentity, User, Player, Collection]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");
        const expiresIn = configService.get<string>("JWT_EXPIRES_IN") || "15m";

        if (!secret) {
          throw new Error(
            "JWT_SECRET must be defined in environment variables",
          );
        }

        return {
          secret,
          signOptions: { expiresIn: expiresIn as any },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    OAuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService, OAuthService, JwtModule],
})
export class AuthModule {}
