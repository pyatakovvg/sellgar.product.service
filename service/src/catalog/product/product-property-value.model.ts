import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { PropertyKind } from '../property/property-kind.enum';
import { PropertyOptionModel } from '../property/property-option.model';
import { ProductPropertyModel } from './product-property.model';

@Entity('product_property_value')
@Check('product_property_value_position_nonnegative', 'position >= 0')
@Check('product_property_value_shape', `
  (property_kind = 'TEXT' AND value_text IS NOT NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NULL)
  OR (property_kind = 'INTEGER' AND value_text IS NULL AND value_integer IS NOT NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NULL)
  OR (property_kind = 'DECIMAL' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NOT NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NULL)
  OR (property_kind = 'BOOLEAN' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NOT NULL AND value_date IS NULL AND value_option_code IS NULL)
  OR (property_kind = 'DATE' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NOT NULL AND value_option_code IS NULL)
  OR (property_kind = 'OPTIONS' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NOT NULL)
`)
@Index('product_property_value_text_idx', ['propertyCode', 'valueText'])
@Index('product_property_value_integer_idx', ['propertyCode', 'valueInteger'])
@Index('product_property_value_decimal_idx', ['propertyCode', 'valueDecimal'])
@Index('product_property_value_boolean_idx', ['propertyCode', 'valueBoolean'])
@Index('product_property_value_date_idx', ['propertyCode', 'valueDate'])
@Index('product_property_value_option_code_idx', ['propertyCode', 'valueOptionCode'])
export class ProductPropertyValueModel {
  @PrimaryColumn({ name: 'product_code', type: 'varchar', length: 256 })
  productCode: string;

  @PrimaryColumn({ name: 'type_uuid', type: 'uuid' })
  typeUuid: string;

  @PrimaryColumn({ name: 'property_code', type: 'varchar', length: 256 })
  propertyCode: string;

  @PrimaryColumn({ name: 'position', type: 'integer' })
  position: number;

  @Column({ name: 'property_kind', type: 'enum', enum: PropertyKind, enumName: 'property_kind_enum' })
  propertyKind: PropertyKind;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText: string | null;

  @Column({ name: 'value_integer', type: 'bigint', nullable: true })
  valueInteger: string | null;

  @Column({ name: 'value_decimal', type: 'numeric', precision: 38, scale: 12, nullable: true })
  valueDecimal: string | null;

  @Column({ name: 'value_boolean', type: 'boolean', nullable: true })
  valueBoolean: boolean | null;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate: string | null;

  @Column({ name: 'value_option_code', type: 'varchar', length: 256, nullable: true })
  valueOptionCode: string | null;

  @ManyToOne(() => ProductPropertyModel, (assignment) => assignment.values, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'product_code', referencedColumnName: 'productCode', foreignKeyConstraintName: 'product_property_value_assignment_fk' },
    { name: 'type_uuid', referencedColumnName: 'typeUuid' },
    { name: 'property_code', referencedColumnName: 'propertyCode', foreignKeyConstraintName: 'product_property_value_option_fk' },
    { name: 'property_kind', referencedColumnName: 'propertyKind' },
  ])
  assignment: ProductPropertyModel;

  @ManyToOne(() => PropertyOptionModel, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'property_code', referencedColumnName: 'propertyCode' },
    { name: 'value_option_code', referencedColumnName: 'code' },
  ])
  option: PropertyOptionModel | null;
}
