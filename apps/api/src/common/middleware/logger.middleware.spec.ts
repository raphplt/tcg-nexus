import { Logger } from "@nestjs/common";
import { LoggerMiddleware } from "./logger.middleware";

describe("LoggerMiddleware", () => {
  let middleware: LoggerMiddleware;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  const createReq = (overrides: Partial<any> = {}) => ({
    method: "GET",
    originalUrl: "/api/decks",
    user: undefined,
    ...overrides,
  });

  const createRes = (statusCode = 200) => {
    const handlers: Record<string, () => void> = {};
    return {
      statusCode,
      on: jest.fn((event: string, cb: () => void) => {
        handlers[event] = cb;
      }),
      emitFinish: () => handlers.finish?.(),
    };
  };

  it("calls next()", () => {
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    middleware.use(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it("logs method, url, status and duration when the response finishes", () => {
    const req = createReq({ method: "POST", originalUrl: "/api/marketplace" });
    const res = createRes(201);
    const next = jest.fn();

    middleware.use(req as any, res as any, next);
    res.emitFinish();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain("POST");
    expect(message).toContain("/api/marketplace");
    expect(message).toContain("201");
    expect(message).toMatch(/\d+(\.\d+)?ms/);
  });

  it("includes the authenticated user id when present", () => {
    const req = createReq({ user: { id: 42 } });
    const res = createRes(200);
    const next = jest.fn();

    middleware.use(req as any, res as any, next);
    res.emitFinish();

    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain("userId=42");
  });

  it("marks the request as anonymous when there is no authenticated user", () => {
    const req = createReq({ user: undefined });
    const res = createRes(200);
    const next = jest.fn();

    middleware.use(req as any, res as any, next);
    res.emitFinish();

    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain("userId=anonymous");
  });

  it("does not log before the response finishes", () => {
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    middleware.use(req as any, res as any, next);

    expect(logSpy).not.toHaveBeenCalled();
  });
});
