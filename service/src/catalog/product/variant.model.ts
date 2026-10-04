import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

import { ProductModel } from './product.model';
import { ProductStatus } from './product-status.enum';
import { VariantImageModel } from './variant-image.model';
import { VariantPropertyModel } from './variant-property.model';

@Entity('variant')
@Unique('variant_code_type_unique', ['code', 'typeUuid'])
@Index('variant_product_idx', ['productCode'])
export class VariantModel {
  @PrimaryColumn({ type: 'varchar', length: 256 })
  code: string;

  @Column({ name: 'product_code', type: 'varchar', length: 256 })
  productCode: string;

  @Column({ name: 'type_uuid', type: 'uuid' })
  typeUuid: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ProductStatus, enumName: 'product_status_enum', default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @ManyToOne(() => ProductModel, (product) => product.variants, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'product_code', referencedColumnName: 'code', foreignKeyConstraintName: 'variant_product_fk' },
    { name: 'type_uuid', referencedColumnName: 'typeUuid' },
  ])
  product: ProductModel;

  @OneToMany(() => VariantPropertyModel, (property) => property.variant)
  properties: VariantPropertyModel[];

  @OneToMany(() => VariantImageModel, (image) => image.variant)
  images: VariantImageModel[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
