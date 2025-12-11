import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

const createMockHost = (overrides?: any): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getResponse: () => overrides?.response || mockResponse,
      getRequest: () => overrides?.request || { url: '/test' }
    })
  } as unknown as ArgumentsHost);

const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
};

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should format HttpException response', () => {
    const filter = new AllExceptionsFilter();
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

    filter.catch(exception, createMockHost());

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad request'
      })
    );
  });

  it('should handle generic Error', () => {
    const filter = new AllExceptionsFilter();
    const exception = new Error('Generic failure');

    filter.catch(exception, createMockHost());

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Generic failure'
      })
    );
  });
});
