import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BrandModel } from '../brand/brand.model';
import { ProductTypeModel } from '../product-type/product-type.model';
import { ProductPropertyModel } from './product-property.model';
import { ProductStatus } from './product-status.enum';
import { VariantModel } from './variant.model';

@Entity('product')
@Check('product_version_positive', 'version > 0')
@Index('product_uuid_type_unique', ['uuid', 'typeUuid'], { unique: true })
@Index('product_type_idx', ['typeUuid'])
@Index('product_brand_idx', ['brandCode'])
export class ProductModel {
  @PrimaryColumn({ type: 'uuid' })
  uuid: string;

  @Column({ name: 'type_uuid', type: 'uuid' })
  typeUuid: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'brand_code', type: 'varchar', length: 256 })
  brandCode: string;

  @Column({ type: 'enum', enum: ProductStatus, enumName: 'product_status_enum', default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @ManyToOne(() => ProductTypeModel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'type_uuid', referencedColumnName: 'uuid', foreignKeyConstraintName: 'product_type_fk' })
  productType: ProductTypeModel;

  @ManyToOne(() => BrandModel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'brand_code', referencedColumnName: 'code', foreignKeyConstraintName: 'product_brand_fk' })
  brand: BrandModel;

  @OneToMany(() => ProductPropertyModel, (property) => property.product)
  properties: ProductPropertyModel[];

  @OneToMany(() => VariantModel, (variant) => variant.product)
  variants: VariantModel[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
