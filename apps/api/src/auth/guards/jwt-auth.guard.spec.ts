import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  const createMockContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new JwtAuthGuard(reflector);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("handleRequest", () => {
    it("should return user as-is when authenticated and route is protected", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      const ctx = createMockContext();
      const user = { id: 1 };
      expect(guard.handleRequest(null, user, null, ctx)).toBe(user);
    });

    it("should return null on a public route when no user is present", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
      const ctx = createMockContext();
      expect(guard.handleRequest(null, null, null, ctx)).toBeNull();
    });

    it("should return user on a public route when one is present", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
      const ctx = createMockContext();
      const user = { id: 2 };
      expect(guard.handleRequest(null, user, null, ctx)).toBe(user);
    });

    it("should throw UnauthorizedException on a protected route without user", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      const ctx = createMockContext();
      expect(() => guard.handleRequest(null, null, null, ctx)).toThrow(
        UnauthorizedException,
      );
    });

    it("should rethrow the original error on a protected route when one is provided", () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      const ctx = createMockContext();
      const err = new Error("boom");
      expect(() => guard.handleRequest(err, null, null, ctx)).toThrow(err);
    });
  });
});
