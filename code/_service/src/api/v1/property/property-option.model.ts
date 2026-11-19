import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { PropertyModel } from './property.model';
import { PropertyOptionMetadataModel } from './property-option-metadata.model';

@Entity('property_option')
@Unique(['propertyUuid', 'code'])
export class PropertyOptionModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'property_uuid', type: 'uuid' })
  propertyUuid: string;

  @JoinColumn({ name: 'property_uuid' })
  @ManyToOne(() => PropertyModel, (property) => property.options, { onDelete: 'CASCADE' })
  property: PropertyModel;

  @Column({ name: 'code', type: 'varchar', length: 256 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => PropertyOptionMetadataModel, (metadata) => metadata.option)
  metadata: PropertyOptionMetadataModel[];

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    comment: 'дата создания',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: string;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    comment: 'дата обновления',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: string;
}
