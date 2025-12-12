import { RefreshTokenDto } from './refresh-token.dto';

describe('RefreshTokenDto', () => {
  it('should hold a refresh token', () => {
    const dto = new RefreshTokenDto();
    dto.refreshToken = 'token';
    expect(dto.refreshToken).toBe('token');
  });
});
