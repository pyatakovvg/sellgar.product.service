import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Unique } from 'typeorm';

import { PropertyKind } from '../property/property-kind.enum';
import { TypeVariantFieldModel } from '../product-type/type-variant-field.model';
import { VariantModel } from './variant.model';
import { VariantPropertyValueModel } from './variant-property-value.model';

@Entity('variant_property')
@Unique('variant_property_value_owner_unique', ['variantCode', 'typeUuid', 'propertyCode', 'propertyKind'])
export class VariantPropertyModel {
  @PrimaryColumn({ name: 'variant_code', type: 'varchar', length: 256 })
  variantCode: string;

  @PrimaryColumn({ name: 'type_uuid', type: 'uuid' })
  typeUuid: string;

  @PrimaryColumn({ name: 'property_code', type: 'varchar', length: 256 })
  propertyCode: string;

  @Column({ name: 'property_kind', type: 'enum', enum: PropertyKind, enumName: 'property_kind_enum' })
  propertyKind: PropertyKind;

  @ManyToOne(() => VariantModel, (variant) => variant.properties, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'variant_code', referencedColumnName: 'code', foreignKeyConstraintName: 'variant_property_variant_fk' },
    { name: 'type_uuid', referencedColumnName: 'typeUuid', foreignKeyConstraintName: 'variant_property_type_field_fk' },
  ])
  variant: VariantModel;

  @ManyToOne(() => TypeVariantFieldModel, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'type_uuid', referencedColumnName: 'typeUuid' },
    { name: 'property_code', referencedColumnName: 'propertyCode' },
    { name: 'property_kind', referencedColumnName: 'propertyKind' },
  ])
  typeField: TypeVariantFieldModel;

  @OneToMany(() => VariantPropertyValueModel, (value) => value.assignment)
  values: VariantPropertyValueModel[];
}
