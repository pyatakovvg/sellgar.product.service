import { Check, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';

import { PropertyOptionExtraModel } from './property-option-extra.model';
import { PropertyModel } from './property.model';

@Entity('property_option')
@Check('property_option_sort_order_nonnegative', 'sort_order >= 0')
export class PropertyOptionModel {
  @PrimaryColumn({ name: 'property_code', type: 'varchar', length: 256 })
  propertyCode: string;

  @PrimaryColumn({ type: 'varchar', length: 256 })
  code: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToOne(() => PropertyModel, (property) => property.options, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'property_code',
    referencedColumnName: 'code',
    foreignKeyConstraintName: 'property_option_property_fk',
  })
  property: PropertyModel;

  @OneToMany(() => PropertyOptionExtraModel, (extra) => extra.option)
  extras: PropertyOptionExtraModel[];
}
