import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { InboxEvent } from './inbox-event';
import { InvalidInboxEventError } from './inbox-event.error';
import { InboxEventModel } from './inbox-event.model';
import { InboxEventStatus } from './inbox-event-status.enum';

export type InboxAcquireResult = 'process' | 'duplicate';

@Injectable()
export class InboxRepository {
  async acquire(manager: EntityManager, event: InboxEvent): Promise<InboxAcquireResult> {
    const insertion = await manager
      .createQueryBuilder()
      .insert()
      .into(InboxEventModel)
      .values({
        ...event,
        processedAt: null,
        status: InboxEventStatus.PROCESSING,
        attempts: 1,
        lastError: null,
      })
      .orIgnore()
      .returning(['event_uuid'])
      .execute();

    if (insertion.raw.length > 0) return 'process';

    const existing = await manager.findOne(InboxEventModel, {
      where: { eventUuid: event.eventUuid },
      lock: { mode: 'pessimistic_write' },
    });
    if (existing) {
      this.assertSameEvent(existing, event);
      if (existing.status === InboxEventStatus.PROCESSED) return 'duplicate';
      existing.status = InboxEventStatus.PROCESSING;
      existing.processedAt = null;
      existing.lastError = null;
      existing.attempts += 1;
      await manager.save(InboxEventModel, existing);
      return 'process';
    }

    const conflicting = await manager.findOneBy(InboxEventModel, {
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
    });
    if (conflicting) {
      throw new InvalidInboxEventError(
        `Aggregate ${event.aggregateType}/${event.aggregateId} version ${event.aggregateVersion} already belongs to event ${conflicting.eventUuid}`,
      );
    }
    throw new Error(`Inbox event ${event.eventUuid} could not be acquired`);
  }

  markProcessed(manager: EntityManager, eventUuid: string): Promise<unknown> {
    return manager.update(
      InboxEventModel,
      { eventUuid },
      { status: InboxEventStatus.PROCESSED, processedAt: new Date(), lastError: null },
    );
  }

  async markFailed(manager: EntityManager, event: InboxEvent, error: unknown): Promise<void> {
    const existing = await manager.findOne(InboxEventModel, {
      where: { eventUuid: event.eventUuid },
      lock: { mode: 'pessimistic_write' },
    });
    if (existing?.status === InboxEventStatus.PROCESSED) return;

    const values = {
      ...event,
      processedAt: null,
      status: InboxEventStatus.FAILED,
      attempts: (existing?.attempts ?? 0) + 1,
      lastError: this.errorMessage(error),
    };
    await manager.upsert(InboxEventModel, values, ['eventUuid']);
  }

  private assertSameEvent(model: InboxEventModel, event: InboxEvent): void {
    const same = model.producer === event.producer
      && model.schemaVersion === event.schemaVersion
      && model.eventType === event.eventType
      && model.aggregateType === event.aggregateType
      && model.aggregateId === event.aggregateId
      && model.aggregateVersion === event.aggregateVersion;
    if (!same) throw new InvalidInboxEventError(`Event UUID ${event.eventUuid} was reused with another envelope`);
  }

  private errorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 65535);
  }
}
