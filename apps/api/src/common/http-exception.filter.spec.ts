import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

import { AllExceptionsFilter } from './http-exception.filter';

const createHost = (url = '/test') => {
  const response: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const request: any = { url };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request
    })
  } as ArgumentsHost;
  return { host, response, request };
};

describe('AllExceptionsFilter', () => {
  it('should use default message for bad request when empty', () => {
    const { host, response } = createHost();
    const filter = new AllExceptionsFilter();
    const exception = new HttpException({}, HttpStatus.BAD_REQUEST);
    filter.catch(exception, host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Requête invalide.' })
    );
  });

  it('should handle generic error with internal fallback', () => {
    const { host, response } = createHost('/internal');
    const filter = new AllExceptionsFilter();
    filter.catch(new Error('boom'), host);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'boom',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: '/internal'
      })
    );
  });
});
