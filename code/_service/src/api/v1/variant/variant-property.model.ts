import { Entity, Unique, PrimaryColumn, Column, JoinColumn, ManyToOne } from 'typeorm';

import { VariantModel } from './variant.model';
import { PropertyModel } from '../property/property.model';
import { PropertyOptionModel } from '../property/property-option.model';

@Entity('variant_property')
@Unique(['variantUuid', 'propertyUuid'])
export class VariantPropertyModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'variant_uuid', type: 'uuid' })
  variantUuid: string;

  @Column({ name: 'property_uuid', type: 'uuid' })
  propertyUuid: string;

  @Column({ name: 'option_uuid', type: 'uuid', nullable: true })
  optionUuid: string | null;

  @JoinColumn({ name: 'variant_uuid' })
  @ManyToOne(() => VariantModel, (variant) => variant.properties, {
    onDelete: 'CASCADE',
  })
  variant: VariantModel;

  @JoinColumn({ name: 'property_uuid' })
  @ManyToOne(() => PropertyModel, (property) => property.variants, {
    onDelete: 'CASCADE',
  })
  property: PropertyModel;

  @JoinColumn({ name: 'option_uuid' })
  @ManyToOne(() => PropertyOptionModel, { nullable: true, onDelete: 'SET NULL' })
  option: PropertyOptionModel | null;

  @Column({ name: 'value', type: 'varchar', length: 256 })
  value: string;

  @Column({ name: 'order', type: 'int', default: 0 })
  order: number;
}
