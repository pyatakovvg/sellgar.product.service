import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

import { PropertyModel } from '../property/property.model';

@Entity('property_group')
export class PropertyGroupModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'name', type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'description', type: 'varchar', length: 1024 })
  description: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @OneToMany(() => PropertyModel, (property) => property.group)
  properties: PropertyModel[];

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
