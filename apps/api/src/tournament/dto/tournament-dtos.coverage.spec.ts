import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateTournamentDto } from './create-tournament.dto';
import { TournamentQueryDto } from './tournament-query.dto';
import { TournamentRegistrationDto as RegistrationDtoStandalone } from './tournament-registration.dto';
import {
  CreateTournamentPricingDto,
  CreateTournamentRewardDto,
  CreateFullTournamentDto,
  TournamentRegistrationDto as RegistrationDtoFromTournamentDto,
  UpdateTournamentStatusDto
} from './tournament.dto';
import {
  TournamentType,
  TournamentStatus
} from '../entities/tournament.entity';
import { PricingType } from '../entities/tournament-pricing.entity';
import { RewardType } from '../entities/tournament-reward.entity';

describe('Tournament DTO coverage', () => {
  it('should validate CreateTournamentDto with basic fields', () => {
    const dto = plainToInstance(CreateTournamentDto, {
      name: 'Test',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      type: TournamentType.SINGLE_ELIMINATION,
      maxPlayers: 8,
      minPlayers: 2,
      isPublic: true
    });

    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('should transform and default TournamentQueryDto', () => {
    const dto = plainToInstance(TournamentQueryDto, {
      page: '2',
      limit: '5'
    });

    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(5);

    const defaults = new TournamentQueryDto();
    expect(defaults.page).toBe(1);
    expect(defaults.limit).toBe(10);
    expect(defaults.sortBy).toBe('startDate');
    expect(defaults.sortOrder).toBe('ASC');
  });

  it('should validate TournamentRegistrationDto (standalone file)', () => {
    const dto = plainToInstance(RegistrationDtoStandalone, {
      tournamentId: 1,
      playerId: 2,
      notes: 'ok'
    });

    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate tournament.dto.ts classes', () => {
    const pricing = plainToInstance(CreateTournamentPricingDto, {
      type: PricingType.FREE,
      basePrice: 0
    });
    expect(validateSync(pricing)).toHaveLength(0);

    const reward = plainToInstance(CreateTournamentRewardDto, {
      position: 1,
      name: 'Reward',
      type: RewardType.POINTS
    });
    expect(validateSync(reward)).toHaveLength(0);

    const full = plainToInstance(CreateFullTournamentDto, {
      name: 'Full',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      type: TournamentType.SINGLE_ELIMINATION,
      pricing: { type: PricingType.FREE, basePrice: 0 },
      rewards: [{ position: 1, name: 'Reward', type: RewardType.POINTS }]
    });
    expect(validateSync(full)).toHaveLength(0);

    const reg = plainToInstance(RegistrationDtoFromTournamentDto, {
      tournamentId: 1,
      playerId: 2
    });
    expect(validateSync(reg)).toHaveLength(0);

    const status = plainToInstance(UpdateTournamentStatusDto, {
      status: TournamentStatus.IN_PROGRESS,
      reason: 'test'
    });
    expect(validateSync(status)).toHaveLength(0);
  });
});
