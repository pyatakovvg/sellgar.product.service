import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { ProductModel } from '../product/product.model';
import { CategoryClosureModel } from './category-closure.model';
import { CategoryImageModel } from './category-image.model';

@Entity('category')
export class CategoryModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'code', type: 'varchar', length: 256, nullable: false })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 256, nullable: false })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'order', type: 'int', default: 0 })
  order: number;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  // Прямые родители (опционально)
  @OneToMany(() => CategoryClosureModel, (closure) => closure.ancestor)
  ancestors: CategoryClosureModel[];

  // Прямые дети (опционально, для удобства)
  @OneToMany(() => CategoryClosureModel, (closure) => closure.descendant)
  descendants: CategoryClosureModel[];

  @OneToMany(() => ProductModel, (product) => product.categoryUuid)
  products: ProductModel[];

  @OneToMany(() => CategoryImageModel, (categoryImage) => categoryImage.category)
  images: CategoryImageModel[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    comment: 'дата создания',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    comment: 'дата обновления',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
