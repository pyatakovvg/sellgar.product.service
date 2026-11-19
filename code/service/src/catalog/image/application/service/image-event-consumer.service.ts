import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { createHash } from 'node:crypto';
import { EntityManager } from 'typeorm';

import { InboxEvent } from '../../../../integration/inbox/inbox-event';
import { InboxService } from '../../../../integration/inbox/inbox.service';
import { ProductOutboxService } from '../../../../integration/outbox/product-outbox.service';
import { Image } from '../../domain/image';
import { ImageProjectionWriter } from '../../infrastructure/persistence/image-projection.writer';
import { FileCreatedEventDto } from '../../presentation/rmq/dto/file-created-event.dto';
import { FileUpdatedEventDto } from '../../presentation/rmq/dto/file-updated-event.dto';

export class InvalidFileEventError extends Error {}

@Injectable()
export class ImageEventConsumerService {
  constructor(
    private readonly inbox: InboxService,
    private readonly projectionWriter: ImageProjectionWriter,
    private readonly productOutbox: ProductOutboxService,
  ) {}

  async created(payload: unknown): Promise<void> {
    const event = await this.validate(FileCreatedEventDto, payload);
    const image = new Image(event.uuid, event.name, 1);
    await this.consume('file_srv.file.create', image, async (manager) => {
      await this.projectionWriter.insertIfAbsent(manager, image);
    });
  }

  async updated(payload: unknown): Promise<void> {
    const event = await this.validate(FileUpdatedEventDto, payload);
    const image = new Image(event.uuid, event.name, event.version + 1);
    await this.consume('file_srv.file.update', image, async (manager) => {
      await this.projectionWriter.upsertIfNewer(manager, image);
    });
  }

  private async consume(
    eventType: string,
    image: Image,
    apply: (manager: EntityManager) => Promise<void>,
  ): Promise<void> {
    const event = plainToInstance(InboxEvent, {
      eventUuid: this.eventUuid(eventType, image),
      producer: 'file_srv',
      schemaVersion: 1,
      eventType,
      aggregateType: 'image',
      aggregateId: image.uuid,
      aggregateVersion: image.version,
    });
    await this.inbox.consume(event, async (manager) => {
      await apply(manager);
      await this.productOutbox.touchByImage(manager, image.uuid);
    });
  }

  private async validate<T extends object>(type: new () => T, payload: unknown): Promise<T> {
    const event = plainToInstance(type, payload);
    try {
      await validateOrReject(event, { whitelist: true });
    } catch {
      throw new InvalidFileEventError('Invalid file integration event');
    }
    return event;
  }

  private eventUuid(eventType: string, image: Image): string {
    const bytes = createHash('sha256')
      .update(`${eventType}:${image.uuid}:${image.version}:${image.fileName}`)
      .digest()
      .subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const value = bytes.toString('hex');
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }
}
