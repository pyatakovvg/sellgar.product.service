import {
  Check,
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

import { UnitModel } from '../unit/unit.model';
import { PropertyKind } from './property-kind.enum';
import { PropertyOptionModel } from './property-option.model';

@Entity('property')
@Check('property_version_positive', 'version > 0')
@Unique('property_code_kind_unique', ['code', 'kind'])
export class PropertyModel {
  @PrimaryColumn({ type: 'varchar', length: 256 })
  code: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: PropertyKind, enumName: 'property_kind_enum' })
  kind: PropertyKind;

  @Column({ name: 'unit_code', type: 'varchar', length: 256, nullable: true })
  unitCode: string | null;

  @ManyToOne(() => UnitModel, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_code', referencedColumnName: 'code', foreignKeyConstraintName: 'property_unit_fk' })
  unit: UnitModel | null;

  @OneToMany(() => PropertyOptionModel, (option) => option.property)
  options: PropertyOptionModel[];

  @Column({ type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
