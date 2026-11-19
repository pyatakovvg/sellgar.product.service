import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { validateOrReject } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';

import { InboxEvent } from './inbox-event';
import { InvalidInboxEventError } from './inbox-event.error';
import { InboxRepository } from './inbox.repository';

export type InboxHandler = (manager: EntityManager) => Promise<void>;
export type InboxConsumeResult = 'processed' | 'duplicate';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly repository: InboxRepository,
  ) {}

  async consume(event: InboxEvent, handler: InboxHandler): Promise<InboxConsumeResult> {
    await this.validate(event);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const acquired = await this.repository.acquire(manager, event);
        if (acquired === 'duplicate') return 'duplicate';
        await handler(manager);
        await this.repository.markProcessed(manager, event.eventUuid);
        return 'processed';
      });
    } catch (error) {
      if (!(error instanceof InvalidInboxEventError)) await this.recordFailure(event, error);
      throw error;
    }
  }

  private async validate(event: InboxEvent): Promise<void> {
    try {
      await validateOrReject(event, { whitelist: true, forbidNonWhitelisted: true });
    } catch {
      throw new InvalidInboxEventError('Invalid inbox event envelope');
    }
  }

  private async recordFailure(event: InboxEvent, error: unknown): Promise<void> {
    try {
      await this.dataSource.transaction((manager) => this.repository.markFailed(manager, event, error));
    } catch (recordError) {
      this.logger.error(
        `Failed to record inbox error for ${event.eventUuid}`,
        recordError instanceof Error ? recordError.stack : undefined,
      );
    }
  }
}
