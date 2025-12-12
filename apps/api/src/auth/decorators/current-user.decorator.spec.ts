import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser decorator', () => {
  it('should extract user from request', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser })
      })
    } as unknown as ExecutionContext;

    // Get the factory function from the decorator
    class TestClass {
      test(@CurrentUser() user: any) {
        return user;
      }
    }
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestClass, 'test');
    const key = Object.keys(metadata)[0];
    const factory = metadata[key].factory;

    const result = factory(null, ctx);
    expect(result).toEqual(mockUser);
  });
});
