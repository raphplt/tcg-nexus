import { CardPopularityScheduler } from './card-popularity.scheduler';
import { CardPopularityService } from './card-popularity.service';

describe('CardPopularityScheduler', () => {
  const service = {
    aggregateDailyMetrics: jest.fn()
  } as unknown as CardPopularityService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger manual aggregation', async () => {
    const scheduler = new CardPopularityScheduler(service);
    await scheduler.triggerAggregation();
    expect(service.aggregateDailyMetrics).toHaveBeenCalled();
  });

  it('should handle daily aggregation and log errors', async () => {
    const scheduler = new CardPopularityScheduler(service);
    (service.aggregateDailyMetrics as jest.Mock).mockResolvedValueOnce(
      undefined
    );
    await scheduler.handleDailyAggregation();
    expect(service.aggregateDailyMetrics).toHaveBeenCalled();

    const error = new Error('fail');
    (service.aggregateDailyMetrics as jest.Mock).mockRejectedValueOnce(error);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await scheduler.handleDailyAggregation();
    errorSpy.mockRestore();
  });
});
