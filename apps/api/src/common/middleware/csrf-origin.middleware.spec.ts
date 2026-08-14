import { ForbiddenException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { CsrfOriginMiddleware } from "./csrf-origin.middleware";

const buildRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    method: "POST",
    cookies: { accessToken: "token" },
    headers: {},
    ...overrides,
  }) as unknown as Request;

describe("CsrfOriginMiddleware", () => {
  const originalEnv = { ...process.env };
  let middleware: CsrfOriginMiddleware;
  let next: NextFunction;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      FRONTEND_URL: "https://tcg-nexus.org",
    };
    middleware = new CsrfOriginMiddleware();
    next = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const run = (req: Request) =>
    middleware.use(req, {} as Response, next as NextFunction);

  it("rejects a cookie-authenticated write from an untrusted origin", () => {
    const req = buildRequest({
      headers: { origin: "https://evil.example" },
    } as Partial<Request>);

    expect(() => run(req)).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });

  it("falls back to the Referer when Origin is absent", () => {
    const req = buildRequest({
      headers: { referer: "https://evil.example/attack.html" },
    } as Partial<Request>);

    expect(() => run(req)).toThrow(ForbiddenException);
  });

  it("accepts the configured frontend origin", () => {
    const req = buildRequest({
      headers: { origin: "https://tcg-nexus.org" },
    } as Partial<Request>);

    run(req);
    expect(next).toHaveBeenCalled();
  });

  it("lets safe methods through", () => {
    run(buildRequest({ method: "GET" }));
    expect(next).toHaveBeenCalled();
  });

  it("ignores requests without a session cookie", () => {
    const req = buildRequest({
      cookies: {},
      headers: { origin: "https://evil.example" },
    } as Partial<Request>);

    run(req);
    expect(next).toHaveBeenCalled();
  });

  it("lets a server-to-server call through: no Origin means no browser", () => {
    run(buildRequest());
    expect(next).toHaveBeenCalled();
  });
});
