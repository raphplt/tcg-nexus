import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  const getJwtFactory = () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule) as any[];
    const jwtAsync = imports.find((i) => typeof i === 'object' && i?.providers);
    const optionsProvider = jwtAsync?.providers?.find((p: any) => p?.useFactory);
    return optionsProvider?.useFactory as (config: ConfigService) => any;
  };

  it('should define module', () => {
    expect(new AuthModule()).toBeInstanceOf(AuthModule);
  });

  it('jwt factory should throw when secret missing', () => {
    const factory = getJwtFactory();
    const config = { get: jest.fn().mockReturnValue(undefined) } as any as ConfigService;
    expect(() => factory(config)).toThrow(
      'JWT_SECRET must be defined in environment variables'
    );
  });

  it('jwt factory returns config when secret provided', () => {
    const factory = getJwtFactory();
    const config = {
      get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'secret' : '1h'))
    } as any as ConfigService;
    const result = factory(config);
    expect(result).toMatchObject({ secret: 'secret' });
  });
});
