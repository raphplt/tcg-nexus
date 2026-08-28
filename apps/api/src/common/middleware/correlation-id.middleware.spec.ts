import { CorrelationIdMiddleware } from "./correlation-id.middleware";

describe("CorrelationIdMiddleware", () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
  });

  it("propagates existing X-Request-ID header", () => {
    const req: any = { headers: { "x-request-id": "custom-uuid-123" } };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers["x-request-id"]).toBe("custom-uuid-123");
    expect(req.id).toBe("custom-uuid-123");
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-Request-ID",
      "custom-uuid-123",
    );
    expect(next).toHaveBeenCalled();
  });

  it("generates a new UUID when X-Request-ID is missing", () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers["x-request-id"]).toBeDefined();
    expect(typeof req.headers["x-request-id"]).toBe("string");
    expect(req.id).toBe(req.headers["x-request-id"]);
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-ID", req.id);
    expect(next).toHaveBeenCalled();
  });
});
