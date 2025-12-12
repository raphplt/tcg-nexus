import { NestFactory } from '@nestjs/core';
import { bootstrap } from './main';

jest.mock('@nestjs/core', () => {
  const actual = jest.requireActual('@nestjs/core');
  return {
    ...actual,
    NestFactory: {
      create: jest.fn().mockResolvedValue({
        use: jest.fn(),
        useGlobalPipes: jest.fn(),
        useGlobalFilters: jest.fn(),
        useGlobalInterceptors: jest.fn(),
        enableCors: jest.fn(),
        get: jest.fn(),
        listen: jest.fn().mockResolvedValue(undefined)
      })
    }
  };
});

jest.mock('@nestjs/swagger', () => {
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
      setup: jest.fn()
    },
    ApiTags: () => () => {},
    ApiBearerAuth: () => () => {},
    ApiOperation: () => () => {},
    ApiResponse: () => () => {},
    ApiBody: () => () => {},
    ApiParam: () => () => {},
    ApiQuery: () => () => {},
    ApiProperty: () => () => {},
    ApiPropertyOptional: () => () => {},
    PartialType: (cls: any) => cls
  };
});

jest.mock('cookie-parser', () =>
  jest.fn(() => (_req: any, _res: any, next: any) => next && next())
);

describe('main bootstrap', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test', PORT: '3050' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should bootstrap application and listen on port', async () => {
    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalled();
    const createdApp = await (NestFactory.create as jest.Mock).mock.results[0]
      ?.value;
    expect(createdApp.useGlobalPipes).toHaveBeenCalled();
    expect(createdApp.listen).toHaveBeenCalled();
  });
});

describe('main bootstrap error', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test', PORT: '3050' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should log error when bootstrap fails', async () => {
    (NestFactory.create as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await bootstrap();

    expect(errorSpy).toHaveBeenCalledWith('fail');
    errorSpy.mockRestore();
  });
});
