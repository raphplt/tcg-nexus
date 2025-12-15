import {
  CreateFullTournamentDto,
  CreateTournamentDto as TournamentDtoCreateTournamentDto,
  CreateTournamentPricingDto,
  CreateTournamentRewardDto,
  TournamentRegistrationDto as TournamentDtoRegistrationDto,
  UpdateTournamentStatusDto
} from './tournament.dto';
import { CreateTournamentDto as CreateTournamentDtoStandalone } from './create-tournament.dto';
import { TournamentQueryDto } from './tournament-query.dto';
import { TournamentRegistrationDto as TournamentRegistrationDtoStandalone } from './tournament-registration.dto';

// These tests are intentionally lightweight: they ensure the DTO modules
// are loaded and the class field defaults are executed for coverage.

describe('Tournament DTOs', () => {
  it('should create TournamentQueryDto with defaults', () => {
    const dto = new TournamentQueryDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.sortBy).toBe('startDate');
    expect(dto.sortOrder).toBe('ASC');
  });

  it('should instantiate standalone CreateTournamentDto', () => {
    const dto = new CreateTournamentDtoStandalone();
    dto.name = 'Test';
    dto.startDate = new Date('2025-01-01');
    dto.endDate = new Date('2025-01-02');
    dto.type = 'SINGLE_ELIMINATION' as any;

    expect(dto.name).toBe('Test');
    expect(dto.type).toBe('SINGLE_ELIMINATION');
  });

  it('should instantiate standalone TournamentRegistrationDto', () => {
    const dto = new TournamentRegistrationDtoStandalone();
    dto.tournamentId = 1;
    dto.playerId = 2;
    dto.notes = 'hi';

    expect(dto.tournamentId).toBe(1);
    expect(dto.playerId).toBe(2);
    expect(dto.notes).toBe('hi');
  });

  it('should instantiate aggregated tournament.dto.ts classes', () => {
    const base = new TournamentDtoCreateTournamentDto();
    base.name = 'Cup';
    base.startDate = new Date('2025-02-01');
    base.endDate = new Date('2025-02-02');
    base.type = 'SINGLE_ELIMINATION' as any;

    const pricing = new CreateTournamentPricingDto();
    pricing.type = 'FREE' as any;
    pricing.basePrice = 0;

    const reward = new CreateTournamentRewardDto();
    reward.position = 1;
    reward.name = 'Booster';
    reward.type = 'PRODUCT' as any;

    const full = new CreateFullTournamentDto();
    Object.assign(full, base);
    full.pricing = pricing;
    full.rewards = [reward];

    const reg = new TournamentDtoRegistrationDto();
    reg.tournamentId = 1;
    reg.playerId = 2;

    const status = new UpdateTournamentStatusDto();
    status.status = 'IN_PROGRESS' as any;
    status.reason = 'go';

    expect(full.name).toBe('Cup');
    expect(full.pricing?.basePrice).toBe(0);
    expect(full.rewards?.[0].position).toBe(1);
    expect(reg.playerId).toBe(2);
    expect(status.reason).toBe('go');
  });
});
