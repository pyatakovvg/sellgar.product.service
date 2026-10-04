import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { PropertyOptionModel } from './property-option.model';

export enum PropertyOptionMetadataValueTypeEnum {
  'TEXT' = 'TEXT',
  'COLOR' = 'COLOR',
  'IMAGE' = 'IMAGE',
  'ICON' = 'ICON',
}

@Entity('property_option_metadata')
export class PropertyOptionMetadataModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'option_uuid', type: 'uuid' })
  optionUuid: string;

  @JoinColumn({ name: 'option_uuid' })
  @ManyToOne(() => PropertyOptionModel, (option) => option.metadata, { onDelete: 'CASCADE' })
  option: PropertyOptionModel;

  @Column({ name: 'value_type', type: 'enum', enum: PropertyOptionMetadataValueTypeEnum })
  valueType: PropertyOptionMetadataValueTypeEnum;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'text_value', type: 'varchar', length: 1024, nullable: true })
  textValue: string | null;

  @Column({ name: 'color_value', type: 'varchar', length: 16, nullable: true })
  colorValue: string | null;

  @Column({ name: 'file_uuid', type: 'uuid', nullable: true })
  fileUuid: string | null;

  @Column({ name: 'icon_code', type: 'varchar', length: 256, nullable: true })
  iconCode: string | null;

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
