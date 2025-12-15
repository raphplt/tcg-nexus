import { ExecutionContext } from '@nestjs/common';

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    createParamDecorator: (factory: any) => factory
  };
});

import {
  TournamentOrganizer,
  Tournament,
  TournamentPlayer,
  TournamentRegistration
} from './tournament.decorators';

const ctxFactory = (req: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req
    })
  }) as unknown as ExecutionContext;

describe('Tournament decorators', () => {
  it('should return organizer from request', () => {
    const req = { tournamentOrganizer: { id: 1 } };
    expect(TournamentOrganizer(null, ctxFactory(req))).toEqual({ id: 1 });
  });

  it('should return tournament from request', () => {
    const req = { tournament: { id: 2 } };
    expect(Tournament(null, ctxFactory(req))).toEqual({ id: 2 });
  });

  it('should return player from request', () => {
    const req = { tournamentPlayer: { id: 3 } };
    expect(TournamentPlayer(null, ctxFactory(req))).toEqual({ id: 3 });
  });

  it('should return registration from request', () => {
    const req = { tournamentRegistration: { id: 4 } };
    expect(TournamentRegistration(null, ctxFactory(req))).toEqual({ id: 4 });
  });
});
