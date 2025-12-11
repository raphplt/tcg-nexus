import { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser decorator', () => {
  it('should extract user from request', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser })
      })
    } as unknown as ExecutionContext;

    const factory = CurrentUser(null, ctx);
    expect(factory).toEqual(mockUser);
  });
});
