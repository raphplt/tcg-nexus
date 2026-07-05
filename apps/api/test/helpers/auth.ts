import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Server } from "http";
import request from "supertest";
import { Repository } from "typeorm";
import { UserRole } from "../../src/common/enums/user";
import { User } from "../../src/user/entities/user.entity";

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

export async function createAdminUser(
  httpServer: Server,
  app: INestApplication,
  overrides: Partial<TestUserCredentials> = {},
): Promise<TestUser> {
  const user = await createUser(httpServer, overrides);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  await userRepo.update(user.id, { role: UserRole.ADMIN });
  return user;
}

export async function getPlayerId(
  httpServer: Server,
  accessToken: string,
): Promise<number> {
  const response = await request(httpServer)
    .get("/users/me")
    .set("Authorization", authHeader(accessToken));

  if (response.status !== 200) {
    throw new Error(
      `getPlayerId failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  const playerId = response.body.player?.id;
  if (playerId == null) {
    throw new Error("Player profile missing for authenticated user");
  }

  return playerId;
}
