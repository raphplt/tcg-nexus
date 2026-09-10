import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { bootstrap } from "./main";

// NOTE: Bootstrap uses a mocked NestFactory; importing the real module would
// initialize native mail rendering resources unrelated to this unit test.
jest.mock("./app.module", () => ({ AppModule: class AppModule {} }));

jest.mock("@nestjs/core", () => {
  const actual = jest.requireActual("@nestjs/core");
  return {
    ...actual,
    NestFactory: {
      create: jest.fn().mockResolvedValue({
        set: jest.fn(),
        use: jest.fn(),
        setGlobalPrefix: jest.fn(),
        useGlobalPipes: jest.fn(),
        useGlobalFilters: jest.fn(),
        useGlobalInterceptors: jest.fn(),
        enableCors: jest.fn(),
        get: jest.fn(),
        getHttpServer: jest.fn().mockReturnValue({}),
        listen: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };
});

jest.mock("@nestjs/swagger", () => {
  class MockDocBuilder {
    setTitle() {
      return this;
    }
    setDescription() {
      return this;
    }
    setVersion() {
      return this;
    }
    addBearerAuth() {
      return this;
    }
    build() {
      return {};
    }
  }
  return {
    DocumentBuilder: MockDocBuilder,
    SwaggerModule: {
      createDocument: jest.fn(),
      setup: jest.fn(),
    },
    ApiTags: () => () => {},
    ApiBearerAuth: () => () => {},
    ApiOperation: () => () => {},
    ApiOkResponse: () => () => {},
    ApiResponse: () => () => {},
    ApiBody: () => () => {},
    ApiConsumes: () => () => {},
    ApiParam: () => () => {},
    ApiQuery: () => () => {},
    ApiProperty: () => () => {},
    ApiPropertyOptional: () => () => {},
    PartialType: (cls: any) => cls,
    OmitType: (cls: any) => cls,
    PickType: (cls: any) => cls,
    IntersectionType: (cls: any) => cls,
  };
});

jest.mock("cookie-parser", () =>
  jest.fn(() => (_req: any, _res: any, next: any) => next && next()),
);

describe("main bootstrap", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test", PORT: "3050" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should bootstrap application and listen on port", async () => {
    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalled();
    const createdApp = await (NestFactory.create as jest.Mock).mock.results[0]
      ?.value;
    expect(createdApp.useGlobalPipes).toHaveBeenCalled();
    expect(createdApp.listen).toHaveBeenCalled();
  });

  it("does not expose Swagger in production by default", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SWAGGER_ENABLED;

    await bootstrap();

    expect(SwaggerModule.setup).not.toHaveBeenCalled();
  });

  it("exposes Swagger in production when explicitly enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.SWAGGER_ENABLED = "true";

    await bootstrap();

    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      "api/docs",
      expect.anything(),
      expect.any(Function),
      expect.any(Object),
    );
  });
});

describe("main bootstrap error", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test", PORT: "3050" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("rethrows a fatal bootstrap error instead of starting half-configured", async () => {
    const failure = new Error("fail");
    (NestFactory.create as jest.Mock).mockRejectedValueOnce(failure);
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(bootstrap()).rejects.toThrow(failure);

    expect(errorSpy).toHaveBeenCalledWith(
      "Fatal error during bootstrap",
      failure,
    );
    errorSpy.mockRestore();
  });
});
