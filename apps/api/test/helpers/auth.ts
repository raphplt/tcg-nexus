import type { Server } from "http";
import request from "supertest";

export interface TestUserCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface TestUser extends TestUserCredentials {
  id: number;
  accessToken: string;
  refreshToken: string;
  cookies: string[];
}

const DEFAULT_PASSWORD = "Password123!";

export function uniqueEmail(prefix = "test"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
}

export async function createUser(
  httpServer: Server,
  overrides: Partial<TestUserCredentials> = {},
): Promise<TestUser> {
  const email = overrides.email ?? uniqueEmail();
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const firstName = overrides.firstName ?? "Test";
  const lastName = overrides.lastName ?? "User";

  const response = await request(httpServer).post("/auth/register").send({
    email,
    password,
    confirmPassword: password,
    firstName,
    lastName,
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(
      `createUser failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  const body = response.body;
  const setCookies = (response.headers["set-cookie"] ??
    []) as unknown as string[];

  return {
    id: body.user.id,
    email,
    password,
    firstName,
    lastName,
    accessToken: body.tokens.accessToken,
    refreshToken: body.tokens.refreshToken,
    cookies: setCookies,
  };
}

export async function login(
  httpServer: Server,
  email: string,
  password: string,
): Promise<{
  user: { id: number; email: string };
  accessToken: string;
  refreshToken: string;
  cookies: string[];
}> {
  const response = await request(httpServer)
    .post("/auth/login")
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(
      `login failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return {
    user: response.body.user,
    accessToken: response.body.tokens.accessToken,
    refreshToken: response.body.tokens.refreshToken,
    cookies: (response.headers["set-cookie"] ?? []) as unknown as string[],
  };
}

export function getCookieValue(
  cookies: string[],
  name: string,
): string | undefined {
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const [cookieName, ...rest] = pair.split("=");
    if (cookieName === name) {
      return rest.join("=");
    }
  }
  return undefined;
}

export function authHeader(token: string): string {
  return `Bearer ${token}`;
}
