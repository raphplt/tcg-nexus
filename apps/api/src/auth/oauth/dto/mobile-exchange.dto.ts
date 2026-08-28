import { IsNotEmpty, IsString, IsUrl } from "class-validator";

/**
 * Payload for mobile OAuth PKCE authorization code exchange.
 */
export class MobileOAuthExchangeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  codeVerifier: string;

  @IsString()
  @IsNotEmpty()
  redirectUri: string;
}
