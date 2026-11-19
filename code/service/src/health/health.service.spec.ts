import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HealthService } from './health.service';

describe('Product readiness', () => {
  const database = { query: jest.fn() };
  let health: HealthService;

  beforeEach(() => {
    database.query.mockReset().mockResolvedValue([{ '?column?': 1 }]);
    health = new HealthService(database as unknown as DataSource);
  });

  it('requires both command and event consumers', async () => {
    await expect(health.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
    health.setConsumerConnected('commands', true);
    await expect(health.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
    health.setConsumerConnected('events', true);
    await expect(health.check()).resolves.toEqual({ service: 'sellgar.product.service', status: 'ok' });
  });

  it.each(['commands', 'events'] as const)('rejects readiness after %s disconnects', async (consumer) => {
    health.setConsumerConnected('commands', true);
    health.setConsumerConnected('events', true);
    health.setConsumerConnected(consumer, false);

    await expect(health.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects readiness when the database cannot be queried', async () => {
    health.setConsumerConnected('commands', true);
    health.setConsumerConnected('events', true);
    database.query.mockRejectedValue(new Error('Database connection lost'));

    await expect(health.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
