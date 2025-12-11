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

  it('should handle object response and default messages', () => {
    const filter = new AllExceptionsFilter();
    const exception = new HttpException(
      { message: undefined, error: 'Forbidden' },
      HttpStatus.FORBIDDEN
    );

    filter.catch(exception, createMockHost());

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Accès interdit.',
        error: 'Forbidden'
      })
    );
  });

  it('should handle unauthorized with default message', () => {
    const filter = new AllExceptionsFilter();
    const exception = new HttpException(
      { message: undefined, error: 'Unauthorized' },
      HttpStatus.UNAUTHORIZED
    );

    filter.catch(exception, createMockHost());

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Non autorisé.'
      })
    );
  });

  it('should handle not found and conflict messages', () => {
    const filter = new AllExceptionsFilter();
    const notFound = new HttpException(
      { message: undefined },
      HttpStatus.NOT_FOUND
    );
    filter.catch(notFound, createMockHost());

    const conflict = new HttpException(
      { message: undefined },
      HttpStatus.CONFLICT
    );
    filter.catch(conflict, createMockHost());

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ressource non trouvée.' })
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Conflit de données.' })
    );
  });
});
