import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { verifyAccessToken } from "@/utils/server-auth";

const secret = "test-secret-with-enough-entropy";
const key = new TextEncoder().encode(secret);

async function tokenWithExpiration(expiration: string): Promise<string> {
  return new SignJWT({ role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("42")
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(key);
}

describe("verifyAccessToken", () => {
  it("accepts a signed, unexpired access token", async () => {
    const token = await tokenWithExpiration("5m");

    await expect(verifyAccessToken(token, secret)).resolves.toBe(true);
  });

  it("rejects expired and tampered access tokens", async () => {
    const expired = await tokenWithExpiration("0s");
    const valid = await tokenWithExpiration("5m");
    const tampered = `${valid.slice(0, -1)}${valid.endsWith("a") ? "b" : "a"}`;

    await expect(verifyAccessToken(expired, secret)).resolves.toBe(false);
    await expect(verifyAccessToken(tampered, secret)).resolves.toBe(false);
  });

  it("fails closed when the shared secret is unavailable", async () => {
    const token = await tokenWithExpiration("5m");

    await expect(verifyAccessToken(token, undefined)).resolves.toBe(false);
  });
});
