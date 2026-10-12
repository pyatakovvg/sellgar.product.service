import { Injectable } from '@nestjs/common';
import { OutboxWriter } from '@sellgar/outbox';
import { EntityManager } from 'typeorm';

@Injectable()
export class BrandImageOutboxService {
  constructor(private readonly writer: OutboxWriter) {}

  removed(manager: EntityManager, brandCode: string, version: number, imageUuids: string[]): Promise<void> {
    return this.writer.add(manager, {
      eventType: 'brand.images.removed',
      aggregateType: 'brand',
      aggregateId: brandCode,
      aggregateVersion: version,
      schemaVersion: 1,
      payload: { imageUuids },
    });
  }
}
