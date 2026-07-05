import { INestApplication, Type } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import cookieParser from "cookie-parser";
import { AppModule } from "../../src/app.module";
import { ExternalTournamentSyncService } from "../../src/tournament/services/external-tournament-sync.service";

const passThroughGuard = { canActivate: () => true };

const disabledExternalTournamentSync = {
  onModuleInit: jest.fn(),
  syncExternalTournaments: jest.fn(),
};

export interface E2eProviderOverride {
  provide: Type<unknown> | string | symbol;
  useValue: unknown;
}

export interface CreateE2eAppOptions {
  providerOverrides?: E2eProviderOverride[];
}

export async function createE2eApp(
  options: CreateE2eAppOptions = {},
): Promise<{ app: INestApplication; moduleFixture: TestingModule }> {
  let moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue(passThroughGuard)
    .overrideProvider(ExternalTournamentSyncService)
    .useValue(disabledExternalTournamentSync);

  for (const override of options.providerOverrides ?? []) {
    moduleBuilder = moduleBuilder
      .overrideProvider(override.provide)
      .useValue(override.useValue);
  }

  const moduleFixture = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  await app.init();

  return { app, moduleFixture };
}
