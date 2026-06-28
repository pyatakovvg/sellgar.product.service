import {
  Entity,
  PrimaryColumn,
  Column,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { UnitModel } from '../unit/unit.model';
import { VariantPropertyModel } from '../variant/variant-property.model';
import { PropertyGroupModel } from '../property-group/property-group.model';

export enum PropertyTypeEnum {
  'TEXT' = 'TEXT',
  'CHECKBOX' = 'CHECKBOX',
  'RADIO' = 'RADIO',
  'DATE' = 'DATE',
  'RANGE' = 'RANGE',
}

@Entity('property')
export class PropertyModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'code', type: 'varchar', length: 256 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'description', type: 'varchar', length: 1024 })
  description: string;

  @Column({ name: 'type', type: 'enum', enum: PropertyTypeEnum })
  type: PropertyTypeEnum;

  @Column({ name: 'group_uuid', type: 'uuid' })
  groupUuid: string;

  @JoinColumn({ name: 'group_uuid' })
  @ManyToOne(() => PropertyGroupModel, (group) => group.properties, { cascade: true, onDelete: 'CASCADE' })
  group: PropertyGroupModel;

  @Column({ name: 'unit_uuid', type: 'uuid', nullable: true })
  unitUuid: string | null;

  @JoinColumn({ name: 'unit_uuid' })
  @ManyToOne(() => UnitModel, (unit) => unit.uuid, { cascade: true, onDelete: 'CASCADE' })
  unit: UnitModel;

  @OneToMany(() => VariantPropertyModel, (variantProperty) => variantProperty.property)
  variants: VariantPropertyModel[];

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
