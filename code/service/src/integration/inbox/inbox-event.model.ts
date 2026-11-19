import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

import { InboxEventStatus } from './inbox-event-status.enum';

@Entity('inbox_event')
@Index(['aggregateType', 'aggregateId', 'aggregateVersion'], { unique: true })
export class InboxEventModel {
  @PrimaryColumn('uuid', { name: 'event_uuid' })
  eventUuid: string;

  @Column({ type: 'varchar', length: 128 })
  producer: string;

  @Column({ name: 'schema_version', type: 'integer' })
  schemaVersion: number;

  @Column({ name: 'event_type', type: 'varchar', length: 256 })
  eventType: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 128 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 256 })
  aggregateId: string;

  @Column({ name: 'aggregate_version', type: 'integer' })
  aggregateVersion: number;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'varchar', length: 32 })
  status: InboxEventStatus;

  @Column({ type: 'integer', default: 1 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;
}
