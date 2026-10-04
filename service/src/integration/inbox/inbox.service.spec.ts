import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { DataSource, EntityManager } from 'typeorm';

import { InboxEvent } from './inbox-event';
import { InboxRepository } from './inbox.repository';
import { InboxService } from './inbox.service';

describe(InboxService.name, () => {
  const manager = {} as EntityManager;
  const dataSource = {
    transaction: jest.fn((operation: (entityManager: EntityManager) => Promise<unknown>) => operation(manager)),
  };
  const repository = {
    acquire: jest.fn(),
    markProcessed: jest.fn(),
    markFailed: jest.fn(),
  };
  const service = new InboxService(
    dataSource as unknown as DataSource,
    repository as unknown as InboxRepository,
  );
  const event = plainToInstance(InboxEvent, {
    eventUuid: '11111111-1111-4111-8111-111111111111',
    producer: 'file_srv',
    schemaVersion: 1,
    eventType: 'file_srv.file.create',
    aggregateType: 'image',
    aggregateId: '22222222-2222-4222-8222-222222222222',
    aggregateVersion: 1,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repository.acquire.mockResolvedValue('process');
    repository.markProcessed.mockResolvedValue(undefined);
    repository.markFailed.mockResolvedValue(undefined);
  });

  it('applies the handler and marks the event processed in one transaction', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);

    await expect(service.consume(event, handler)).resolves.toBe('processed');

    expect(handler).toHaveBeenCalledWith(manager);
    expect(repository.markProcessed).toHaveBeenCalledWith(manager, event.eventUuid);
  });

  it('skips the handler for an already processed event', async () => {
    repository.acquire.mockResolvedValue('duplicate');
    const handler = jest.fn();

    await expect(service.consume(event, handler)).resolves.toBe('duplicate');

    expect(handler).not.toHaveBeenCalled();
    expect(repository.markProcessed).not.toHaveBeenCalled();
  });

  it('rolls back domain work, records the failed attempt separately and rethrows', async () => {
    const failure = new Error('projection failed');
    const handler = jest.fn().mockRejectedValue(failure);

    await expect(service.consume(event, handler)).rejects.toBe(failure);

    expect(dataSource.transaction).toHaveBeenCalledTimes(2);
    expect(repository.markFailed).toHaveBeenCalledWith(manager, event, failure);
  });
});
