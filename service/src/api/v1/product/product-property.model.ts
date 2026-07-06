import { Entity, Unique, PrimaryColumn, Column, JoinColumn, ManyToOne } from 'typeorm';

import { ProductModel } from './product.model';
import { PropertyModel } from '../property/property.model';
import { PropertyOptionModel } from '../property/property-option.model';

@Entity('product_property')
@Unique(['productUuid', 'propertyUuid'])
export class ProductPropertyModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'product_uuid', type: 'uuid' })
  productUuid: string;

  @Column({ name: 'property_uuid', type: 'uuid' })
  propertyUuid: string;

  @Column({ name: 'option_uuid', type: 'uuid', nullable: true })
  optionUuid: string | null;

  @JoinColumn({ name: 'product_uuid' })
  @ManyToOne(() => ProductModel, (product) => product.properties, {
    onDelete: 'CASCADE',
  })
  product: ProductModel;

  @JoinColumn({ name: 'property_uuid' })
  @ManyToOne(() => PropertyModel, (property) => property.products, {
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
