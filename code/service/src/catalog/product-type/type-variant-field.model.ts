import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';

import { PropertyKind } from '../property/property-kind.enum';
import { PropertyModel } from '../property/property.model';
import { ProductTypeModel } from './product-type.model';

@Entity('type_variant_field')
@Check('type_variant_field_sort_order_nonnegative', 'sort_order >= 0')
@Check('type_variant_field_boolean_single', `NOT (property_kind = 'BOOLEAN' AND multiple = true)`)
@Unique('type_variant_field_kind_unique', ['typeUuid', 'propertyCode', 'propertyKind'])
@Index('type_variant_field_property_idx', ['propertyCode'])
export class TypeVariantFieldModel {
  @PrimaryColumn({ name: 'type_uuid', type: 'uuid' })
  typeUuid: string;

  @PrimaryColumn({ name: 'property_code', type: 'varchar', length: 256 })
  propertyCode: string;

  @Column({ name: 'property_kind', type: 'enum', enum: PropertyKind, enumName: 'property_kind_enum' })
  propertyKind: PropertyKind;

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @Column({ type: 'boolean', default: false })
  multiple: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToOne(() => ProductTypeModel, (type) => type.variantFields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'type_uuid', referencedColumnName: 'uuid', foreignKeyConstraintName: 'type_variant_field_type_fk' })
  productType: ProductTypeModel;

  @ManyToOne(() => PropertyModel, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'property_code', referencedColumnName: 'code', foreignKeyConstraintName: 'type_variant_field_property_fk' },
    { name: 'property_kind', referencedColumnName: 'kind' },
  ])
  property: PropertyModel;
}
