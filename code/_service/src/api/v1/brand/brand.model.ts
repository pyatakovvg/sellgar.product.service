import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

import { ProductModel } from '../product/product.model';
import { BrandImageModel } from './brand-image.model';

@Entity('brand')
export class BrandModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'code', type: 'varchar', length: 256, comment: 'код бренда' })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 256, comment: 'название бренда' })
  name: string;

  @Column({ name: 'description', type: 'text', comment: 'описание бренда' })
  description: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @OneToMany(() => ProductModel, (product) => product.brand)
  products: ProductModel[];

  @OneToMany(() => BrandImageModel, (brandImage) => brandImage.brand)
  images: BrandImageModel[];

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
