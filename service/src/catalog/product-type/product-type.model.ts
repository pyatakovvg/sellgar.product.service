import { Check, Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { TypeProductFieldModel } from './type-product-field.model';
import { TypeVariantFieldModel } from './type-variant-field.model';

@Entity('product_type')
@Check('product_type_version_positive', 'version > 0')
export class ProductTypeModel {
  @PrimaryColumn({ type: 'uuid' })
  uuid: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @OneToMany(() => TypeProductFieldModel, (field) => field.productType)
  productFields: TypeProductFieldModel[];

  @OneToMany(() => TypeVariantFieldModel, (field) => field.productType)
  variantFields: TypeVariantFieldModel[];

  activeProductCount: number;

  archivedProductCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
