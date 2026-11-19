import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Unique } from 'typeorm';

import { PropertyKind } from '../property/property-kind.enum';
import { TypeProductFieldModel } from '../product-type/type-product-field.model';
import { ProductModel } from './product.model';
import { ProductPropertyValueModel } from './product-property-value.model';

@Entity('product_property')
@Unique('product_property_value_owner_unique', ['productUuid', 'typeUuid', 'propertyCode', 'propertyKind'])
export class ProductPropertyModel {
  @PrimaryColumn({ name: 'product_uuid', type: 'uuid' })
  productUuid: string;

  @PrimaryColumn({ name: 'type_uuid', type: 'uuid' })
  typeUuid: string;

  @PrimaryColumn({ name: 'property_code', type: 'varchar', length: 256 })
  propertyCode: string;

  @Column({ name: 'property_kind', type: 'enum', enum: PropertyKind, enumName: 'property_kind_enum' })
  propertyKind: PropertyKind;

  @ManyToOne(() => ProductModel, (product) => product.properties, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'product_uuid', referencedColumnName: 'uuid', foreignKeyConstraintName: 'product_property_product_fk' },
    { name: 'type_uuid', referencedColumnName: 'typeUuid', foreignKeyConstraintName: 'product_property_type_field_fk' },
  ])
  product: ProductModel;

  @ManyToOne(() => TypeProductFieldModel, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'type_uuid', referencedColumnName: 'typeUuid' },
    { name: 'property_code', referencedColumnName: 'propertyCode' },
    { name: 'property_kind', referencedColumnName: 'propertyKind' },
  ])
  typeField: TypeProductFieldModel;

  @OneToMany(() => ProductPropertyValueModel, (value) => value.assignment)
  values: ProductPropertyValueModel[];
}
