import { jwtVerify } from "jose";

/**
 * Verifies an API access token locally for route-gating purposes.
 *
 * API endpoints remain authoritative and perform their own user lookup. This
 * check only prevents the web proxy from calling the profile endpoint for
 * every navigation and prefetch request.
 *
 * @param token - Signed access-token JWT.
 * @param secret - Shared HMAC secret used by the API to sign access tokens.
 * @returns Whether the token has a valid HS256 signature, expiry, and subject.
 */
export async function verifyAccessToken(
  token: string,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret) return false;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { algorithms: ["HS256"] },
    );
    return typeof payload.sub === "string" || typeof payload.sub === "number";
  } catch {
    return false;
  }
}
