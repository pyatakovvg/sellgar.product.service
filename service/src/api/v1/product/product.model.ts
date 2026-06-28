import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { BrandModel } from '../brand/brand.model';
import { CatalogStatus } from '../catalog/catalog-status.enum';
import { CategoryModel } from '../category/category.model';
import { VariantModel } from '../variant/variant.model';

@Entity('product')
export class ProductModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Index({ fulltext: true })
  @Column({ name: 'name', type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CatalogStatus,
    enumName: 'catalog_status_enum',
    default: CatalogStatus.Active,
  })
  status: CatalogStatus;

  @Column({ name: 'brand_uuid', type: 'uuid' })
  brandUuid: string;

  @JoinColumn({ name: 'brand_uuid' })
  @ManyToOne(() => BrandModel, (brand) => brand.uuid)
  brand: BrandModel;

  @Column({ name: 'category_uuid', type: 'uuid' })
  categoryUuid: string;

  @JoinColumn({ name: 'category_uuid' })
  @ManyToOne(() => CategoryModel, (category) => category.uuid)
  category: CategoryModel;

  @OneToMany(() => VariantModel, (variant) => variant.product)
  variants: VariantModel[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    comment: 'дата создания',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: string;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    comment: 'дата обновления',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: string;
}
